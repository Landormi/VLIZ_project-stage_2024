const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { code } = event.queryStringParameters;
    const CLIENT_ID = 'Ov23lixU1XxqIib5KkT3';
    const CLIENT_SECRET = '326909b94f082c5cda2d261f0decda36e671de4e';

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code
        })
    });

    const tokenData = await tokenResponse.json();

    return {
        statusCode: 200,
        body: JSON.stringify(tokenData)
    };
};
