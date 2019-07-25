# JS Framework Comparative Analysis

# Svelte Framework
## Description
Svelte is a radical new approach to building user interfaces. Whereas traditional frameworks like React and Vue do the bulk of their work in the browser, Svelte shifts that work into a compile step that happens when you build your app.

Instead of using techniques like virtual DOM diffing, Svelte writes code that surgically updates the DOM when the state of your app changes.

## Research Conducted By: Tia Rose, Matt Wilkin, Michael Chapman

### Overall Score and Comments
#### Score (Out of 10): 9
#### General Comments
Describe the stack (front-end only? full stack?), database, efficiency, etc. Describe the general usability and learnability

Svelte is mostly a front-end framework, but it is evolving to be come full stack. 

Using Svelte is very easy requiring minimal setup. The offical website has everything you would need to get started and learn including clear, simply examples and thorough documentation. 

Their API breaks down 


#### Pros
* No boilerplate
* No virtual DOM
* Truly reactive
* Great documentation
* Simple implementation
* Great tutorials
* Styling within the same file (so no editor extensions or wacky syntax)
* Crazy easy to update state ithout all the usual cruft
* Fast load speeds
* Compiles to ideal JavaScript
* Component-based framework with 0 extra plugins
* It only needs a dead simple build script to get going
* Hardly any files are needed in a base project
* Runs is topological order



#### Cons
* Testing is a bit difficult - involves compiling the component and mounting it to something and then performing the tests.
* Very young framework 
* Requires HTML and CSS which can be noisy for some developers
* Not the best case for larger projects
* No TypeScript support but version 3 is laying the groundwork for it
* When making updates to code, sometimes need to re-build to see updates show

### Ratings and Reviews
#### Documentation
The documentation that Svelte provides is phenomenal. If you have a question about how to implement something, or how the syntax should look you, the only place you need to go is on [Svelte's](https://svelte.dev/) official website. You can even access their [tutorial](https://svelte.dev/tutorial/basics) page and their [example](https://svelte.dev/examples#hello-world) page. Svelte even provides a nice [REPL](https://svelte.dev/repl/hello-world?version=3.6.8) to sandbox in, and even [codesandbox](https://codesandbox.io/) supports Svelte.

#### Systems Requirements
Above and beyond 'node' and 'linux', what dependencies or core requirements exist for this framework?  

No dependencies or core requirement to get Svelte started. There are some dependencies that play nice with Svelte:  Svelte Router SPA(for hash based routing), abstract-state-router 


Can it play at AWS/Heroku?  Does it require a certain database?

Yes and it can work with Firebase Database - NoSQL


#### Ramp-Up Projections
How long would/should it take a team of mid-junior developers to become productive?

In order for a mid-junior developer to be productive in Svelte, they will first need to explore the [tutorials](https://svelte.dev/tutorial/basics) and view the [examples](https://svelte.dev/examples#hello-world). That can take between 2-3 days. Then after that, they should have a solid understanding and a good base to build a basic app in 2-3 more days.

#### Community Support and Adoption levels
How popular is this framework?

* Svelte extension on VS code has 44,706 downloads as of 7/25/2019
* 176 contributors on Svelte's [github](https://github.com/sveltejs/svelte)


What big companies are running on it?

* Chess.com
* GoDaddy
* The New York Times  

How is it "seen" in the general JS community?

* Very its light and fast, very simple API, the DOM synchronusly whenever a component changes. Easy to incremedieally adopt without doing a big re-write.


Is there an active community of developers supporting and growing it?
* Yes there it is a small community, but it is slowly growing. There are 176 contributors on Svelte's [github](https://github.com/sveltejs/svelte)


### Links and Resources
* [Svelte](https://svelte.dev/)
* [Docs](https://svelte.dev/docs)
* [Examples/Tutorials](https://svelte.dev/tutorial/basics)
* [FAQs](https://github.com/sveltejs/svelte/wiki/FAQ)

### Code Demos
* [Code Repository](https://github.com/michaelchapman-401-advanced-javascript/svelte-todo)

### Operating Instructions
[git clone](https://github.com/michaelchapman-401-advanced-javascript/svelte-todo)

`npm i`

`npm start` or `npm run start` or `npm run start dev`



