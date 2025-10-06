// This file was generated from src/generateCodeHighlightingStyles.ts.
// Don't edit directly!

#let EndLine() = raw("\n")
#let Skylighting(sourcelines) = {
	let blocks = []
	let bgcolor = rgb("#f8f9fa");
	for ln in sourcelines {
		blocks = blocks + ln + EndLine()
	}
	align(center, block(
		above: 1.2em,
		width: 85%,
		inset: (x: 1.4em, y: 1.2em),
		// would love this, but can't style differently across page breaks
		//    (https://github.com/typst/typst/issues/735)
		// radius: 0.5em,
		fill: bgcolor,
		align(left, par(leading: 0.4em, blocks))
	))
}

#let AlertTok(s) = text(style: "italic", weight: "bold", fill: rgb("#177500"), raw(s))
#let AnnotationTok(s) = text(style: "italic", weight: "bold", fill: rgb("#177500"), raw(s))
#let AttributeTok(s) = text(weight: "light", fill: rgb("#880073"), raw(s))
#let BaseNTok(s) = text(weight: "light", fill: rgb("#1c01ce"), raw(s))
#let BuiltInTok(s) = text(weight: "bold", fill: rgb("#880073"), raw(s))
#let CharTok(s) = text(weight: "light", fill: rgb("#c41a16"), raw(s))
#let CommentTok(s) = text(style: "italic", weight: "light", fill: rgb("#177500"), raw(s))
#let CommentVarTok(s) = text(style: "italic", weight: "bold", fill: rgb("#177500"), raw(s))
#let ConstantTok(s) = text(weight: "light", fill: rgb("#000000"), raw(s))
#let ControlFlowTok(s) = text(weight: "bold", fill: rgb("#880073"), raw(s))
#let DataTypeTok(s) = text(weight: "light", fill: rgb("#880073"), raw(s))
#let DecValTok(s) = text(weight: "light", fill: rgb("#1c01ce"), raw(s))
#let DocumentationTok(s) = text(style: "italic", weight: "light", fill: rgb("#177500"), raw(s))
#let ErrorTok(s) = text(weight: "bold", fill: rgb("#000000"), raw(s))
#let ExtensionTok(s) = text(weight: "light", raw(s))
#let FloatTok(s) = text(weight: "light", fill: rgb("#1c01ce"), raw(s))
#let FunctionTok(s) = text(weight: "bold", fill: rgb("#3f6e75"), raw(s))
#let ImportTok(s) = text(weight: "bold", fill: rgb("#880073"), raw(s))
#let InformationTok(s) = text(style: "italic", weight: "bold", fill: rgb("#177500"), raw(s))
#let KeywordTok(s) = text(weight: "light", fill: rgb("#880073"), raw(s))
#let NormalTok(s) = text(weight: "light", raw(s))
#let OperatorTok(s) = text(weight: "light", fill: rgb("#000000"), raw(s))
#let OtherTok(s) = text(weight: "light", raw(s))
#let PreprocessorTok(s) = text(style: "italic", weight: "light", fill: rgb("#633820"), raw(s))
#let RegionMarkerTok(s) = text(weight: "light", raw(s))
#let SpecialCharTok(s) = text(weight: "light", fill: rgb("#c41a16"), raw(s))
#let SpecialStringTok(s) = text(weight: "light", fill: rgb("#880073"), raw(s))
#let StringTok(s) = text(weight: "light", fill: rgb("#c41a16"), raw(s))
#let VariableTok(s) = text(weight: "light", fill: rgb("#000000"), raw(s))
#let VerbatimStringTok(s) = text(weight: "light", fill: rgb("#c41a16"), raw(s))
#let WarningTok(s) = text(style: "italic", weight: "bold", fill: rgb("#177500"), raw(s))

#let InlineCode(s) = box(inset: (x: 3pt), outset: (y: 4pt), radius: 1pt, stroke: (0.1pt + rgb("#adb5bd")), fill: rgb("#e9ecef"), s)

// End of src/generateCodeHighlightingStyles.ts generation.