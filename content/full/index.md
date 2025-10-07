---
title: Download Full Book
no_nav: true
tags: [in_menu]
templateEngine: [vto, md]
---

{{ set filename = sitedata.title.replaceAll(" ", "_") }}
{{ set localFilePath = `pubs/web/static/downloads/${filename}` }}

You can download a nicely typeset PDF version of the full book:

* [PDF](/downloads/{{filename}}.pdf) ({{ `${localFilePath}.pdf` |> getFileSize }})

Here are also some ebook versions in various formats for your tablets and readers and whatnots:

* [ePUB](/downloads/{{filename}}.epub) ({{ `${localFilePath}.epub` |> getFileSize }})
* [azw3](/downloads/{{filename}}.azw3) ({{ `${localFilePath}.azw3` |> getFileSize }})
* [mobi](/downloads/{{filename}}.mobi) ({{ `${localFilePath}.mobi` |> getFileSize }})

If you like that sort of thing, you can even read [the whole book in Markdown format](/downloads/{{filename}}.md).

<div class="revisionData"><span class="fullRevisionString">{{ revisionStringFull }}</span><span class="shortRevisionString">{{ revisionStringShort }}</span><time class="revisionTimestamp" datetime="{{ revisionDateString }}">{{ revisionDateString }}</time></div>
