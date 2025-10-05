#let horizontalrule = line(start: (25%,0%), end: (75%,0%))

// the numbers here are just taken from LaTeX's memoir class; I'm not really *this* fussy
#let standard_styles(doc) = {
	set page(
		paper: "us-letter",
		margin: (
			left: 1.0325in,
			right: 1.0325in,
			top: 2.02in,
			bottom: 1.4in,
		),
		header: context {
			let laterDivisions = query(
				selector(heading.where(level: 1))
				.or(
					selector(heading.where(level: 2))
				).after(here())
			)
			if laterDivisions.len() > 0 {
				let nextDiv = counter(page).at(laterDivisions.first().location()).at(0)
				let currPage = counter(page).get().at(0)
				if nextDiv != currPage [
					#align(right)[#counter(page).display()]
				]
			} else { align(right)[#counter(page).display()] }
		},
		footer: context {
			let laterDivisions = query(
				selector(heading.where(level: 2)).before(here())
			)
			if laterDivisions.len() > 0 {
				let prevDiv = counter(page).at(laterDivisions.last().location()).at(0)
				let currPage = counter(page).get().at(0)
				if prevDiv == currPage [
					#align(center)[#counter(page).display()]
				]
			}
		},
		footer-descent: 0% + 0pt
	)

	set text(
		font: "Alegreya",
		size: 14pt,
		weight: "regular",
	)

	show raw: set text(font: "Cascadia Mono")

	show link: set text(fill: rgb(0, 0, 204))

	set par(
		justify: true,
		leading: 0.6em,
		spacing: 0.6em,
		first-line-indent: 1.45em,
	)

	show heading.where(level: 1): it => align(horizon + right)[
		#v(-(96pt + 1.2em)) // font size * 2 + spacing * 2
		#text(font: "Alegreya SC", size: 48pt, weight: "semibold", it.body)
	]

	show heading.where(level: 2): it => [
		#align(center)[
			#pagebreak()
			#v(4em)
			#par(justify: false, leading: 21pt)[
				#text(font: "Alegreya SC", weight:"semibold", size: 36pt, hyphenate: false, it.body)
			]
			#v(1.15em)
		]
		#linebreak()
	]

	show heading.where(level: 3): set text(size: 20pt)
	show heading.where(level: 3): set block(below: 1.1em)

	show footnote.entry: set text(size: 11pt)

	show quote.where(block: true): set par(justify: false, spacing: 1em)
	show quote.where(block: true): it => pad(left: 1.4em, right: 1.4em)[
		#block(
			stroke: (left: .25em + gray, rest: none),
			radius: 1.4em,
			breakable: false,
			outset: (y: 1em),
			inset: (left: 0.8em),
		)[#it]
	]

	set list(
		indent: 1.5em,
		spacing: 0.8em,
	)

	set table(
		stroke: none,
		inset: (x, y) => {
			if y == 0 {
				(x: 0pt, y: 7.5pt)
			}
			else if y == 1 {
				(x: 0pt, top: 7.5pt, bottom: 4pt)
			}
			// last line bottom inset added in pre-processor
			//   because Typst sadly doesn't have a way to
			//   detect the *last* line :(
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
	show figure.caption: it => {
		it.body
		v(4.5pt)
	}

	show figure.where(placement: none): it => {
		v(1em)
		it
		v(1em)
	}
	doc
}
