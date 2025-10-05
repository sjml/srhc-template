#include "srcs/title.typ"
#include "srcs/rights.typ"

#include "srcs/toc.typ"

#counter(page).update(1)
#set page(numbering: "i")
#include "srcs/prelims.typ"

#counter(page).update(0)
#set page(numbering: "1")
#include "srcs/main.typ"
