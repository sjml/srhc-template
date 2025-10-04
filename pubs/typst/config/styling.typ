#let horizontalrule = line(start: (25%,0%), end: (75%,0%))

// the numbers here are just taken from LaTeX's memoir class; I'm not really *this* fussy
#let standard_styles(doc) = {
	set page(
		paper: "us-letter",
		margin: (
			left: 1.0325in,
			right: 1.0325in,
		)
	)

	set text(
		font: "Alegreya",
		size: 14pt,
		weight: "regular"
	)

	set par(
		justify: true,
		leading: 0.57em,
		spacing: 1.85em,
	)

	set list(
		indent: 1.5em,
		spacing: 0.8em,
	)

	show link: set text(fill: rgb(0, 0, 204))

	set table(
		inset: 6pt,
		stroke: none,
	)
	show figure.where(
		kind: table
	): set figure.caption(position: top)

	doc
}
