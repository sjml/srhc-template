Syntax highlighter files in the KDE format, used by Pandoc for marking up the code sections. 

"Pymod" syntax is identical to Python, but includes some extra variable types to make it easier to read for non-programmers. 

Some this is based on guesswork and squinting at the file to try and figure out how it does its job. I wouldn't use this for production work but (a) Pymod is not a real language anyway and (b) it works fine for this. 

Changes from original Python syntax file:
* adds "integer", "decimal", and "string" as variable types
* tags function and class definitions as such

Original file is also here for easy diff-ing. 
