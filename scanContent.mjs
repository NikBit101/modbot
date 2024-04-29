import fetch from "node-fetch";
import apiKey from "./vtConfig.json" assert { type: 'json' };

function isMalicious(analysisResult) {
	const results = analysisResult.data.attributes.stats;

	const malCount = results.malicious || 0;
	const susCount = results.suspicious || 0;

	// Assign weights to each severity status
	const maliciousWeight = 3;
	const suspiciousWeight = 1;

	// Calculate the weighted sum
	const weightedSum = (maliciousWeight * malCount) + (suspiciousWeight * susCount);
	console.log(weightedSum);
	if (weightedSum <= 1) { return 'clean'; }
	else if (weightedSum <= 3) { return 'low'; }
	else if (weightedSum <= 6) { return 'medium'; }
	else { return 'high'; }
}

export async function scanURL(url) {
	const options = {
		method: 'POST',
		headers: {
			accept: 'application/json',
			'x-apikey': apiKey.apiKey,
			'content-type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({ url: url })
	};

	try {
		const scanResult = await fetch('https://www.virustotal.com/api/v3/urls', options);
		const response = await scanResult.json();
		let analysisData;

		// Check if analysis is completed, otherwise, keep polling until completed
		while (!analysisData || analysisData.data.attributes.status !== 'completed') {
			const analysisResponse = await fetch(response.data.links.self, {
				headers: {
					'x-apikey': apiKey.apiKey
				}
			});
			analysisData = await analysisResponse.json();
			console.log(analysisData.data.attributes.status);
			// Add a delay before next poll (e.g., wait for 1 second)
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		return isMalicious(analysisData);
	} catch (err) {
		console.error(err);
		console.log('Error here');
	}
}