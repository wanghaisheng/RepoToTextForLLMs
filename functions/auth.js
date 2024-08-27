export default {
    async fetch(request) {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');

        if (!code) {
            return new Response('Authorization code not found', { status: 400 });
        }

        // Replace with your GitHub OAuth client credentials
        const CLIENT_ID = 'YOUR_CLIENT_ID';
        const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
        const redirectUri = 'https://your-cloudflare-pages-url.com/auth/callback';

        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code,
                redirect_uri: redirectUri,
            }),
        });

        const data = await response.json();

        if (data.error) {
            return new Response(`Error: ${data.error_description}`, { status: 500 });
        }

        // Store the token securely (e.g., in a database or secure storage)
        // For simplicity, we are just returning it here
        return new Response(`Access Token: ${data.access_token}`, { status: 200 });
    }
};
