# SRHC Template

[Explore the actual demo site!](https://shaneliesegang.com/projects/srhc-template)

An example site made by the static site generator [Eleventy](https://www.11ty.dev). It's meant to for "book"-style content, i.e. a linear set of prose that you progress through in order, with occasional line-art images and code samples. Extracted from a larger project, partially as motivation to stop futzing with all this tech/build stuff and start finishing the actual content. 

The repository, as it stands, automatically builds both the site itself _and_ downloadable PDF, ePUB, and Kindle formatted ebooks. 

**Aesthetically:** A priority was placed on pleasing and readable typsetting while also adhering as strongly as possible to the standards of each platform. It also had to gracefully handle text in (at least) English, Hebrew, and Greek, which creates some typesetting challenges. It also includes parsing and syntax coloring for a fictional programming language (that is basically Python with a few extra keywords). The front page as well as the first page of content in the book contains a good amount of formatted text to show how everything looks styled. 

**Technically:** Since this was destined for both print and web output, I wanted to use [Pandoc](https://pandoc.org/) to process the input files for both. This meant building [a plugin to swap out Eleventy's built-in Markdown renderer](https://github.com/sjml/eleventy-plugin-pandoc). A little bit hacky, but it works well! 

* _**Web**_
  * **Goods:** 
    * HTML is rigorously semantic; no markup that is solely presentational, with all layout and styling happening in CSS (save the first "bad" below)
    * CSS is modular, easily assembled for the different platforms
    * Two-paned navigation with responsive layout that enables easy reading straight through the website
    * Toggleable Light and Dark themes (or default to the system's preferred theme)
    * Pre-generates compressed Brotli and GZipped versions of compressible files, along with the Apache `.htaccess` file to serve them correctly. (Overkill? Yes. But fun overkill.)
    * All 100s in Lighthouse! (Except the front page; see below.)
  * **Bads:**
    * There are two custom wigets (the table of contents toggle and the theme selector) that are, at the moment, non-accessible. I don't know enough about accessibility to really tackle this, but it's on my list. 
    * The CSS is a little over-engineered at the moment. The final output file is fairly small, which is nice, but the SCSS files are a bit sprawling. 
    * Front page fails to get all 100s in Lighthouse becuase the cover is a JPEG file instead of something like WebP. An easy enough fix if I wanted to go all-in on WebP, but I don't just yet, and supporting multiple image formats would complicate at least one of the markup or the build. 
* _**E-Books**_
  * **Goods:**
    * Builds in all(?) popular formats: ePub for the most featureful layout and color stuff, and azw3/mobi for Kindles. 
    * Uses the same content sources as the web, including the same Markdown parser (Pandoc) and images converted at build-time to fit into what the various output formats need. 
    * Follows best-practices (as much as they could be identified) for each format, so no custom fonts on Kindle, very basic styling on ePub, etc. 
  * **Bads:**
    * Things like the title page and metadata for the ebook platforms are kind of hard-coded, not pulling from [`sitedata.json`](./content/_data/sitedata.json) like the web build is. Since those builds happen outside of Eleventy's process, it's harder to integrate that data procedurally. Much like the accessibility stuff for the web, it's on my list.
