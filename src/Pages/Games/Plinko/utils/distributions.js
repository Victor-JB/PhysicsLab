export function binomialPMF(n, p) {
	const pmf = [];
	let coeff = 1; // C(n,0)
	const q = 1 - p;
	for (let k = 0; k <= n; k++) {
		pmf.push(coeff * Math.pow(p, k) * Math.pow(q, n - k));
		coeff = (coeff * (n - k)) / (k + 1); // C(n,k+1)
	}
	return pmf;
}

export function normalPDF(x, mu, sigma) {
	if (sigma <= 0) return 0;
	const z = (x - mu) / sigma;
	return (1 / (Math.sqrt(2 * Math.PI) * sigma)) * Math.exp(-0.5 * z * z);
}
