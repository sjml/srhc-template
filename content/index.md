---
no_nav: true
layout: frontPage
---
{% set firstSection = collections.all | navFilter | eleventyNavigation | first %}
{% set firstPage = collections.all | navFilter | eleventyNavigation(firstSection.url) | first %}

[![book cover image featuring an extreme closeup of magnets](/img/cover.jpg){.cover}]({{firstPage.url}})

This is a demonstration site for a template for [the static site generator Eleventy](https://11ty.dev). Most of the text is not very interesting unless you like _lorem ipsum_ but it's all here to just show how navigation and everything will work. The template is meant for a "book" style website where you're exploring linear content that is not deeply nested; just sections and chapters, nothing beyond that. I was inspired by [Alex Shpak's "Hugo Book" theme](https://hugo-book-demo.netlify.app/) for [Hugo](https://gohugo.io/), but rebuilt this from scratch to work with Eleventy and with my own design goals. 

Note the responsive theme as you adjust the window size, and the varying light/dark modes you can choose from the widget at the top right. The typography has been carefully tuned to be pleasantly readable on a variety of screen sizes and conditions, but of course everything could be overridden with your own custom CSS. There is only the tiniest soupçon of JavaScript to enable some small UI niceties like the theme switcher, but it degrades gracefully if scripting is not available. 

If you're interested in the template itself, [it's called "SRHC" and is available here](https://github.com/sjml/srhc-template). It may receive updates as the project it's derived from evolves, but here it is for the moment. 

Below is just dummy text showing off various formatting options. Enjoy! 

----

{% inlineFile "resources/demo-assets/formatTest.md" %}
