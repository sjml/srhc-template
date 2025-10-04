function Span(elem)
  -- throw away stuff we don't care about
  if elem.classes:includes("kindle-only") then
    return ""
  end
end
