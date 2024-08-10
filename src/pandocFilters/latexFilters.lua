function Image(elem)
  -- surround all images with image-centering raw LaTeX.
  return {
    pandoc.RawInline("latex", "\\hfill\\break{\\centering"),
    elem,
    pandoc.RawInline("latex", "\\par}")
  }
end


function Span(elem)
  -- throw away stuff we don't care about
  if elem.classes:includes("kindle-only") then
    return ""
  end

  -- right-align quote attributions
  if elem.classes:includes("quote-attribution") then
    return {
      pandoc.RawInline('latex', '\\raggedleft{\\sourceatright{'),
      elem,
      pandoc.RawInline('latex', '}}')
    }
  end
end
