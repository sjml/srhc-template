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
		stroke: none,
		inset: (x, y) => {
			if y == 0 {
				(x: 0pt, y: 7.5pt)
			}
			else if y == 1 {
				(x: 0pt, top: 7.5pt, bottom: 4pt)
			}
			else {
				(x: 0pt, y: 4pt)
			}
		},
		column-gutter: 12pt,
	)

	// table captions show go on top
	show figure.where(
		kind: table
	): set figure.caption(position: top)

	// remove numbering from captions
	//     awaiting the day this can just be a Pandoc flag
	//     (https://github.com/jgm/pandoc/discussions/11191)
	show figure.caption: it => [
		#text(it.body)
		#v(4.5pt)
	]

	doc
}
