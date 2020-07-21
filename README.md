# rreusser.github.io

Hi! Perhaps you're here because you found something interesting on my [sketches page](http://rreusser.github.io/sketches/). If so, welcome! And don't fear! It's not completely impossible to run the code. Steps:

1. `git clone https://github.com/rreusser/rreusser.github.io.git` 
2. `cd rreusser.github.io/src`
3. `npm install` (fsevents might fail to build, but things still seem to work?)
4. Now start a project in the `src/` subdirectory (that's `src/src` from the project root) by typing, e.g. `npm start clifford-torus`

First of all, why a `src` directory within `src`? Because I wanted to deploy one branch and not worry about a `docs` directory or `gh-pages` branch for github pages. TBH I don't totally remember the rationale and I kinda wonder whether `docs/` was an option when I set this up, becuase I feel like I should have definitely chosen that insetad.

Second, what actually happened when we used `npm start <project-name>` to start up a project? I didn't want to maintain a site with a bunch of interconnected build and layout stuff, so when you type `npm start <project-name>`, it looks in `src/src` for a directory with that name. It detects the type of project by checking for 1) markdown, 2) [idyll](https://idyll-lang.org/), or 3) raw js. It runs a dev server or builds accordingly. *Each project is completely independent.* One page can't send you to another while developing. If you change the layout or any common code, you'd have to rebuild all the affected projects manually, one by one.  I've only had to do that once or twice though, so I'm pretty content with it.

Beyond that, I hope something here is useful or informative. I also hope the code is more or less clear, though it's definitely varying levels of cryptic at times since it's not a day job and since the goal here has been to crank out visualizations and not so much to convey how it's done. If you're looking for code that's at times more polished and has a bit more context and comments, you might try checking out my [projects page](http://rreusser.github.io/projects/) instead.

🚀

&copy; 2020 Ricky Reusser. MIT License.
