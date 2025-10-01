# SRHC Template

[Explore the actual demo site!](https://shaneliesegang.com/projects/srhc-template)

An example site made by the static site generator [Lume](https://lume.land). It's meant for "book"-style content, i.e. a linear set of prose that you progress through in order, with occasional line-art images and code samples. Extracted from a larger project, partially as motivation to stop futzing with all this tech/build stuff and start finishing the actual content. 

The repository, as it stands, automatically builds both the site itself _and_ downloadable PDF, ePUB, and Kindle formatted ebooks. 

**Aesthetically:** A priority was placed on pleasing and readable typsetting while adhering as strongly as possible to the standards of each platform. It also had to gracefully handle text in (at least) English, Hebrew, and Greek, which creates some typesetting challenges. It includes parsing and syntax coloring for a fictional programming language (that is basically Python with a few extra keywords). The front page as well as the first page of content in the book contains a good amount of formatted text to show how everything looks styled. 

**Technically:** Since this was destined for both print and web output, I wanted to use [Pandoc](https://pandoc.org/) to process the input files for both. This meant building [a plugin to swap out Lume's built-in Markdown handling](/src/lumeMods/pandocMarkdown.ts). A little bit hacky, but it works well! (Note that it is a bit slower since it's taking a performance hit every time it shells out to Pandoc.)

* _**Web**_
  * **Goods:** 
    * HTML is rigorously semantic; no markup that is solely presentational, with all layout and styling happening in CSS (save the first "bad" below)
    * CSS is modular, easily assembled for the different platforms
    * Two-paned navigation with responsive layout that enables easy reading straight through the website
    * Toggleable Light and Dark themes (or default to the system's preferred theme)
    * Pre-generates compressed Brotli and GZipped versions of compressible files, along with the Apache `.htaccess` file to serve them correctly. (Overkill? Yes. But fun overkill.)
    * All 100s in Lighthouse! (Usually. It can be a little moody.)
  * **Bads:**
    * The CSS is a little over-engineered at the moment. The final output file is fairly small, which is nice, but the SCSS files are a bit sprawling. 
* _**E-Books**_
  * **Goods:**
    * Builds in all(?) popular formats: ePub for the most featureful layout and color stuff, and azw3/mobi for Kindles. 
    * Uses the same content sources as the web, including the same Markdown parser (Pandoc) and images converted at build-time to fit into what the various output formats need. 
    * Follows best-practices (as much as they could be identified) for each format, so no custom fonts on Kindle, very basic styling on ePub, etc. 
  * **Bads:**
    * Things like the title page and metadata for the ebook platforms are kind of hard-coded, not pulling from [`sitedata.json`](./content/_data/sitedata.json) like the web build is. Since those builds happen outside of Lume's process, it's harder to integrate that data procedurally. Much like the accessibility stuff for the web, it's on my list.
