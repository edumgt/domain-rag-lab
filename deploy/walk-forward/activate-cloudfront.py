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
with tempfile.NamedTemporaryFile(mode='w', suffix='.json') as file:
    json.dump(config, file)
    file.flush()
    result = aws('cloudfront', 'update-distribution', '--id', resources['distribution_id'], '--if-match', current['ETag'], '--distribution-config', 'file://' + file.name)
print(json.dumps({'id': resources['distribution_id'], 'domain': result['Distribution']['DomainName'], 'status': result['Distribution']['Status']}))
