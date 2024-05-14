
'''
This script creates a proxy by simulating what io-backend does for adding information relating to the authenticated user.
    Use API_HOST to enter the destination URL on which the Wallet Provider is deployed.
    Use USER_ID to identify the user who is carrying out operations on the Wallet Provider.
'''
from flask import Flask
from flask import request, Response
import requests  # pip package requests

app = Flask(__name__)

API_HOST = "https://walletprovider.example.com"
USER_ID = "User UUID here"

@app.route('/', defaults={'path': ''}, methods=["GET", "POST"])  # ref. https://medium.com/@zwork101/making-a-flask-proxy-server-online-in-10-lines-of-code-44b8721bca6
@app.route('/<path>', methods=["GET", "POST"])  # NOTE: better to specify which methods to be accepted. Otherwise, only GET will be accepted. Ref: https://flask.palletsprojects.com/en/3.0.x/quickstart/#http-methods
def redirect_to_API_HOST(path):  #NOTE var :path will be unused as all path we need will be read from :request ie from flask import request
    res = requests.request(  # ref. https://stackoverflow.com/a/36601467/248616
        method          = request.method,
        url             = request.url.replace(request.host_url, f'{API_HOST}/'),
        headers         = {k:v for k,v in request.headers if k.lower() != 'host'}, # exclude 'host' header
        data            = request.get_data(),
        cookies         = request.cookies,
        allow_redirects = False,
    )

    #region exlcude some keys in :res response
    excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']  #NOTE we here exclude all "hop-by-hop headers" defined by RFC 2616 section 13.5.1 ref. https://www.rfc-editor.org/rfc/rfc2616#section-13.5.1
    headers          = [
        (k,v) for k,v in res.raw.headers.items()
        if k.lower() not in excluded_headers
    ]

    headers['x-iowallet-user-id'] = USER_ID

    response = Response(res.content, res.status_code, headers)
    return response

if __name__ == '__main__':
    app.run(debug=True)