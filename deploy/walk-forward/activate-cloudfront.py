"""Attach the issued pr ACM certificate to the dedicated distribution."""
import json
import subprocess
import tempfile
from pathlib import Path

resources = json.loads(Path(__file__).with_name('aws-resources.json').read_text())

def aws(*args):
    return json.loads(subprocess.check_output(['aws', *args, '--output', 'json'], text=True))

cert = aws('acm', 'describe-certificate', '--region', resources['region'], '--certificate-arn', resources['certificate_arn'])['Certificate']
if cert['Status'] != 'ISSUED':
    raise SystemExit('Certificate is ' + cert['Status'] + '; retry after DNS validation.')
current = aws('cloudfront', 'get-distribution-config', '--id', resources['distribution_id'])
config = current['DistributionConfig']
config['Aliases'] = {'Quantity': 1, 'Items': [resources['domain']]}
config['ViewerCertificate'] = {
    'ACMCertificateArn': resources['certificate_arn'],
    'SSLSupportMethod': 'sni-only',
    'MinimumProtocolVersion': 'TLSv1.2_2021',
}
# pr 전체 앱(로그인, 채팅, 문서 업로드)은 POST/PUT/DELETE 를 쓰므로 모든 메서드를 허용한다. 캐시는 GET/HEAD 만.
config['DefaultCacheBehavior']['AllowedMethods'] = {
    'Quantity': 7,
    'Items': ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
    'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']},
}
# RAG 응답과 백테스트는 30초를 넘길 수 있어 원본 응답 대기 시간을 지원 요청 없이 가능한 최대값(60초)으로 올린다.
config['Origins']['Items'][0]['CustomOriginConfig']['OriginReadTimeout'] = 60
with tempfile.NamedTemporaryFile(mode='w', suffix='.json') as file:
    json.dump(config, file)
    file.flush()
    result = aws('cloudfront', 'update-distribution', '--id', resources['distribution_id'], '--if-match', current['ETag'], '--distribution-config', 'file://' + file.name)
print(json.dumps({'id': resources['distribution_id'], 'domain': result['Distribution']['DomainName'], 'status': result['Distribution']['Status']}))
