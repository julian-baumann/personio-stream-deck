async function getPersonioTokenWithCredentials(clientId, clientSecret) {
    const request = await fetch("https://api.personio.de/v1/auth", {
        method: "POST",
        body: JSON.stringify({
            "client_id": clientId,
            "client_secret": clientSecret
        })
    });

    const response = await request.json();

    return {
        token: response.data["token"],
        expiresIn: response.data["expires_in"]
    };
}