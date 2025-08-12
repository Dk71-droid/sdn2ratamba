const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

export default {
	async fetch(request, env) {
		// Pastikan hanya metode POST yang diizinkan
		if (request.method !== 'POST') {
			// Mengatasi pre-flight OPTIONS request dari CORS
			if (request.method === 'OPTIONS') {
				return new Response(null, {
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type',
					},
				});
			}
			return new Response('Method Not Allowed', { status: 405 });
		}

		// Ambil body permintaan dari aplikasi Anda
		const requestBody = await request.text();

		// Dapatkan kunci API dari secrets yang telah diatur
		const GEMINI_API_KEY = env.GEMINI_API_KEY;

		// Buat URL API Gemini dengan kunci API
		const apiUrlWithKey = `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`;

		// Buat permintaan baru ke Gemini API
		const geminiRequest = new Request(apiUrlWithKey, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: requestBody,
		});

		try {
			// Kirim permintaan dan kembalikan respons
			const response = await fetch(geminiRequest);
			const data = await response.json();
			return new Response(JSON.stringify(data), {
				status: response.status,
				headers: {
					'Content-Type': 'application/json',
					// Tambahkan header CORS ini ke respons
					'Access-Control-Allow-Origin': '*',
				},
			});
		} catch (error) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					// Tambahkan header CORS ini ke respons
					'Access-Control-Allow-Origin': '*',
				},
			});
		}
	},
};
