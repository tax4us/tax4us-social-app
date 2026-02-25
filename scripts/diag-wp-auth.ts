import fetch from "node-fetch";

async function testAuth(user: string, pass: string) {
    const baseUrl = "https://www.tax4us.co.il/wp-json/wp/v2";
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");

    console.log(`Testing: "${user}" ...`);
    try {
        const response = await fetch(`${baseUrl}/users/me`, {
            headers: {
                "Authorization": `Basic ${auth}`
            }
        });

        const data = await response.json();
        if (response.ok) {
            console.log(`✅ SUCCESS: ${user}`);
            return true;
        } else {
            console.log(`❌ FAILED: ${user} - ${JSON.stringify(data)}`);
            return false;
        }
    } catch (e) {
        return false;
    }
}

async function main() {
    console.log("--- FINAL AUTH TEST ---");

    console.log("\nTrying Main Credentials:");
    await testAuth("n8n integration", "tvFc 8gY1 1zMf Mg9X YrCc xrCL");

    console.log("\nTrying Backup Credentials (Regular User):");
    await testAuth("Shai ai", "0nm7^1l&PEN5HAWE7LSamBRu");
    await testAuth("shai-ai", "0nm7^1l&PEN5HAWE7LSamBRu");
    await testAuth("shai", "0nm7^1l&PEN5HAWE7LSamBRu");
    await testAuth("Shai", "0nm7^1l&PEN5HAWE7LSamBRu");
}

main();
