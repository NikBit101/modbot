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
		const analysisURL = response.data.links.self;

		// Fetch detailed analysis using the provided URL
		const analysisResponse = await fetch(analysisURL, {
			headers: {
				'x-apikey': apiKey.apiKey
			}
		});

		const analysisData = await analysisResponse.json();
		//console.log(analysisData);
		//console.log(analysisData.data.attributes.results);
		return isMalicious(analysisData);
	} catch (err) {
		console.error(err);
		console.log('Error here');
	}
}