from web3 import Web3
import urllib.request
import json

w3 = Web3(Web3.HTTPProvider("https://rpc.test.mezo.org"))

for label, factory in [
    ("Slipstream factory", "0x7B61BC8Aa460476d142F1CD107A47297002f69ff"),
    ("MezrangeVaultFactory (yours)", "0x073580C5F37158F563B17983af142dc874c018aa"),
]:
    print(f"\n=== {label}: {factory} ===")
    code = w3.eth.get_code(Web3.to_checksum_address(factory))
    print(f"Code length: {len(code)} bytes")
    print(f"Deployed: {len(code) > 2}")

    try:
        req = urllib.request.Request(
            f"https://explorer.test.mezo.org/api/v2/smart-contracts/{factory}"
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
            print(f"Verified: {data.get('is_verified', False)}")
            print(f"Contract name: {data.get('name', 'unknown')}")
    except Exception as e:
        print(f"Explorer check failed: {e}")
