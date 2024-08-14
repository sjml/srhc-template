---
title: Download Full Book
no_nav: true
tags: [in_menu]
---

{% set filename = sitedata.title | replace(" ", "") %}
{% set localFilePath = ["static/downloads/", filename] | join %}

You can download a nicely typeset PDF version of the full book:

* [PDF](/downloads/{{filename}}.pdf) ({% getFileSize [localFilePath, ".pdf"] %})

Here are also some ebook versions in various formats for your Nooks and Kindles and whatnots:

* [ePUB](/downloads/{{filename}}.epub) ({% getFileSize [localFilePath, ".epub"] %})
* [azw3](/downloads/{{filename}}.azw3) ({% getFileSize [localFilePath, ".azw3"] %})
* [mobi](/downloads/{{filename}}.mobi) ({% getFileSize [localFilePath, ".mobi"] %})

<div class="revisionData"><span class="fullRevisionString">{% getRevisionString "full" %}</span><span class="shortRevisionString">{% getRevisionString "short" %}</span><time class="revisionTimestamp" datetime="{% getRevisionDate %}">{% getRevisionDate %}</time></div>
