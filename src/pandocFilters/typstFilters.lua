function Span(elem)
	-- throw away stuff we don't care about
	if elem.classes:includes("kindle-only") then
		return ""
	end
end

function Code(elem)
	-- inline code blocks get a special token
	return {
		pandoc.RawInline("typst", "#InlineCode["),
		elem,
		pandoc.RawInline("typst", "]")
	}
end

function Inlines(inlines)
	-- turn <cite> tags into emph

	local new_inlines = {}

	local cite_stretches = {}
	for i,v in ipairs(inlines) do
		if v.tag == "RawInline" and v.format == "html" then
			local tag_name = v.text:lower()
			if tag_name:match("^<cite[ >]") then
				if tag_name ~= "<cite>" then
					-- could pass these on but it's a pain and probably won't need it
					io.stderr:write("WARNING: <cite> tag attributes will be discarded (" .. v.text .. ")\n")
				end
				table.insert(cite_stretches, {})
			elseif tag_name == "</cite>" then
				local stretch = table.remove(cite_stretches)
				if stretch then
					table.insert(new_inlines, pandoc.Emph(stretch))
				else
					-- stray closing tag; just pass it on
					table.insert(new_inlines, v)
				end
			else
				if #cite_stretches > 0 then
					table.insert(cite_stretches[#cite_stretches], v)
				else
					table.insert(new_inlines, v)
				end
			end
		elseif #cite_stretches > 0 then
			table.insert(cite_stretches[#cite_stretches], v)
		else
			table.insert(new_inlines, v)
		end
	end

	-- flush unclosed <cite>
	while #cite_stretches > 0 do
		for _, leftover in ipairs(table.remove(cite_stretches)) do
			table.insert(new_inlines, leftover)
		end
	end

	return new_inlines
end
