# DEV PROXY

This script creates a proxy by simulating what io-backend does for adding information relating to the authenticated user.

# How to use

1. [optional] Use pyenv to manage python version and create a virtual environment

    ```sh
    pyenv install
    python3 -m venv .venv #Create virtual environment
    source .venv/bin/activate #Activate environment
    ```

2. Install dependecies

    ```sh
    pip install -r requirements.txt
    ```

3. Create .env file and populate with your information

    ```sh
    cp .env.example .env
    # populate your .env file
    ```

4. Start Web Server

    ```sh
    python app.py
    ```
