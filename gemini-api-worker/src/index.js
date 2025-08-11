// src/index.js

addEventListener('fetch', (event) => {
	event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 });
	}

	const { prompt } = await request.json();

	// Panggil API Gemini
	const geminiApiKey = GEMINI_API_KEY;
	const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`;

	const geminiResponse = await fetch(geminiUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
	});

	const geminiData = await geminiResponse.json();
	const geminiText = geminiData.candidates[0].content.parts[0].text;

	// Simpan respons ke Firestore
	try {
		const firestoreServiceAccountKey = FIREBASE_SERVICE_ACCOUNT_KEY;
		const serviceAccount = JSON.parse(firestoreServiceAccountKey);
		const projectId = serviceAccount.project_id;
		const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/gemini-responses`;

		// Anda perlu mengimplementasikan fungsi getAccessToken yang menghasilkan JWT.
		const accessToken = await getAccessToken(serviceAccount);

		const firestoreData = {
			fields: {
				timestamp: { timestampValue: new Date().toISOString() },
				prompt: { stringValue: prompt },
				response: { stringValue: geminiText },
			},
		};

		await fetch(firestoreUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify(firestoreData),
		});
	} catch (error) {
		console.error('Failed to save to Firestore:', error);
	}

	// Kembalikan respons ke frontend
	return new Response(JSON.stringify({ text: geminiText }), {
		headers: { 'Content-Type': 'application/json' },
	});
}

async function getAccessToken(serviceAccount) {
	// Fungsi ini harus diimplementasikan dengan benar.
	// Anda bisa mencari "Firebase REST API JWT Cloudflare Workers" untuk referensi.
	// Contoh: `https://developers.cloudflare.com/workers/examples/using-firebase-admin/`
	return 'contoh_access_token';
}
