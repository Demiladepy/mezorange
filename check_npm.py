from web3 import Web3
import urllib.request
import json

w3 = Web3(Web3.HTTPProvider("https://rpc.test.mezo.org"))
npm = "0x9B753e11bFEd0D88F6e1D2777E3c7dac42F96062"

print(f"=== NPM: {npm} ===")
code = w3.eth.get_code(Web3.to_checksum_address(npm))
print(f"Code length: {len(code)} bytes")
print(f"Deployed: {len(code) > 2}")

try:
    req = urllib.request.Request(
        f"https://explorer.test.mezo.org/api/v2/smart-contracts/{npm}"
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        data = json.loads(r.read())
        print(f"Verified: {data.get('is_verified', False)}")
        print(f"Contract name: {data.get('name', 'unknown')}")
except Exception as e:
    print(f"Explorer check failed: {e}")

# Smoke-test factory() view if deployed
if len(code) > 2:
    abi = [
        {
            "inputs": [],
            "name": "factory",
            "outputs": [{"type": "address"}],
            "stateMutability": "view",
            "type": "function",
        }
    ]
    contract = w3.eth.contract(address=Web3.to_checksum_address(npm), abi=abi)
    try:
        print(f"NPM.factory(): {contract.functions.factory().call()}")
    except Exception as e:
        print(f"factory() call failed: {e}")
