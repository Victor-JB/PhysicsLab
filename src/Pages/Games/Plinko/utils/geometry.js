export function makePegs({ rows, width, boardWidth, topMargin, rowGap }) {
	const out = [];
	const centerX = width / 2;
	const maxCols = rows + 1;
	const colGap = boardWidth / Math.max(1, maxCols - 1);
	for (let r = 0; r < rows; r++) {
		const cols = r + 1;
		const y = topMargin + r * rowGap;
		const rowWidth = (cols - 1) * colGap;
		const startX = centerX - rowWidth / 2;
		const row = [];
		for (let c = 0; c < cols; c++) row.push({ x: startX + c * colGap, y });
		out.push(row);
	}
	return out;
}

export function makeBins({ rows, width, boardWidth, topMargin, rowGap }) {
	const maxCols = rows + 1;
	const colGap = boardWidth / Math.max(1, maxCols - 1);
	const y = topMargin + rows * rowGap;
	const startX = width / 2 - ((maxCols - 1) * colGap) / 2;
	return Array.from({ length: maxCols }, (_, i) => ({
		x: startX + i * colGap,
		y,
	}));
}
