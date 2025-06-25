from flask import Flask, render_template, send_from_directory
import os
import secrets

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(16)  # Secure random key

@app.route('/')
def index():
    """Serve the main game page"""
    return render_template('index.html')

@app.route('/static/<path:path>')
def send_static(path):
    """Serve static files"""
    return send_from_directory('static', path)

if __name__ == '__main__':
    # Use HTTPS in production
    app.run(debug=True)
