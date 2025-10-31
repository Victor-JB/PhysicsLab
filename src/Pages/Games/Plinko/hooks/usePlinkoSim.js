import { useEffect, useMemo, useRef, useState } from "react";
import { makePegs, makeBins } from "../utils/geometry";
import { binomialPMF, normalPDF } from "../utils/distributions";

// Dimensions kept close to your other canvas games
const width = 800;
const height = 520;

export default function usePlinkoSim() {
	// Board config
	const [rows, setRows] = useState(12);
	const [pRight, setPRight] = useState(0.5);

	// Run control
	const [ballsToDrop, setBallsToDrop] = useState(100);
	const [dropRateMs, setDropRateMs] = useState(60);
	const [running, setRunning] = useState(false);

	// Toggles
	const [showTheoretical, setShowTheoretical] = useState(true);
	const [showNormalApprox, setShowNormalApprox] = useState(true);
	const [showTrails, setShowTrails] = useState(true);

	// Geometry margins
	const topMargin = 60,
		bottomMargin = 150,
		leftMargin = 60,
		rightMargin = 60;
	const boardWidth = width - leftMargin - rightMargin;
	const boardHeight = height - topMargin - bottomMargin;
	const rowGap = boardHeight / Math.max(1, rows);

	// Histogram & bookkeeping
	const [hist, setHist] = useState(() => Array(rows + 1).fill(0));
	const [dropped, setDropped] = useState(0);

	// In-flight ball + trails
	const [activeBall, setActiveBall] = useState(null);
	const [trails, setTrails] = useState([]);

	// Internal timers
	const launchTimerRef = useRef(null);
	const rafRef = useRef();

	// Derived pegs & bins
	const pegs = useMemo(
		() => makePegs({ rows, width, boardWidth, topMargin, rowGap }),
		[rows, boardWidth, rowGap, topMargin]
	);
	const bins = useMemo(
		() => makeBins({ rows, width, boardWidth, topMargin, rowGap }),
		[rows, boardWidth, rowGap, topMargin]
	);

	const baseY = topMargin + rows * rowGap + 60;

	// Re-init hist when rows change
	useEffect(() => {
		setHist(Array(rows + 1).fill(0));
		setDropped(0);
		setActiveBall(null);
		setTrails([]);
	}, [rows]);

	// Compute one discrete path
	const computeBallPath = () => {
		const startX = width / 2;
		const startY = topMargin - rowGap * 0.6;
		const path = [{ x: startX, y: startY }];
		const maxCols = rows + 1;
		const colGap = boardWidth / Math.max(1, maxCols - 1);

		let k = 0;
		for (let r = 0; r < rows; r++) {
			const goRight = Math.random() < pRight;
			if (goRight) k++;

			const rowWidth = r * colGap;
			const rowStartX = width / 2 - rowWidth / 2;
			const x =
				r === 0
					? startX + (goRight ? colGap / 2 : -colGap / 2) * 0.6
					: rowStartX + k * colGap;
			const y = topMargin + r * rowGap;

			const prev = path[path.length - 1];
			const cx = (prev.x + x) / 2 + (Math.random() * 12 - 6);
			const cy = (prev.y + y) / 2 + 8;
			path.push({ x: cx, y: cy }, { x, y });
		}
		const colGap2 = boardWidth / Math.max(1, maxCols - 1);
		const rowWidth2 = rows * colGap2;
		const rowStartX2 = width / 2 - rowWidth2 / 2;
		path.push({
			x: rowStartX2 + k * colGap2,
			y: topMargin + rows * rowGap + 30,
		});

		return { path, bin: k };
	};

	// Launch & settle
	const launchOne = () => {
		const { path, bin } = computeBallPath();
		setActiveBall({ path, bin, seg: 0, t: 0 });
	};
	const settleBall = (bin) => {
		setHist((h) => {
			const n = h.slice();
			n[bin] += 1;
			return n;
		});
		setDropped((d) => d + 1);
	};

	// Animate active ball along polyline (matches your RAF approach). :contentReference[oaicite:4]{index=4}
	useEffect(() => {
		if (!activeBall) return;
		const step = () => {
			setActiveBall((b) => {
				if (!b) return null;
				let { seg, t, path, bin } = b;
				let nt = t + 0.55 * 0.016;
				while (nt >= 1 && seg < path.length - 2) {
					nt -= 1;
					seg += 1;
				}
				if (seg >= path.length - 2 && nt >= 1) {
					setTrails((tr) =>
						tr.length > 120 ? [...tr.slice(1), path] : [...tr, path]
					);
					settleBall(bin);
					return null;
				}
				return { ...b, seg, t: nt };
			});
			rafRef.current = requestAnimationFrame(step);
		};
		rafRef.current = requestAnimationFrame(step);
		return () => cancelAnimationFrame(rafRef.current);
	}, [activeBall]);

	// Auto launcher timer
	useEffect(() => {
		if (!running) {
			if (launchTimerRef.current) clearInterval(launchTimerRef.current);
			launchTimerRef.current = null;
			return;
		}
		if (dropped >= ballsToDrop) {
			setRunning(false);
			return;
		}
		if (!activeBall) launchOne();
		launchTimerRef.current = setInterval(() => {
			if (!activeBall && dropped < ballsToDrop) launchOne();
		}, dropRateMs);
		return () => {
			if (launchTimerRef.current) clearInterval(launchTimerRef.current);
		};
	}, [running, dropped, ballsToDrop, dropRateMs, activeBall]);

	// Reset
	const reset = () => {
		setRunning(false);
		setHist(Array(rows + 1).fill(0));
		setDropped(0);
		setActiveBall(null);
		setTrails([]);
	};

	// Theoretical helpers (for overlays & footer)
	const pmf = useMemo(() => binomialPMF(rows, pRight), [rows, pRight]);
	const mu = rows * pRight;
	const sigma = Math.sqrt(rows * pRight * (1 - pRight));
	const pdfAt = (x) => normalPDF(x, mu, sigma);

	return {
		// dims & geometry
		width,
		height,
		topMargin,
		bottomMargin,
		leftMargin,
		rightMargin,
		boardWidth,
		boardHeight,
		rowGap,
		baseY,
		pegs,
		bins,

		// state
		rows,
		setRows,
		pRight,
		setPRight,
		ballsToDrop,
		setBallsToDrop,
		dropRateMs,
		setDropRateMs,
		running,
		setRunning,
		showTheoretical,
		setShowTheoretical,
		showNormalApprox,
		setShowNormalApprox,
		showTrails,
		setShowTrails,

		// sim data
		hist,
		dropped,
		trails,
		activeBall,
		setActiveBall,

		// math
		pmf,
		mu,
		sigma,
		pdfAt,

		// actions
		reset,
	};
}
