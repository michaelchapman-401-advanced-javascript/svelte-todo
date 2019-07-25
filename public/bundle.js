var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* todo.svelte generated by Svelte v3.6.8 */

    const file = "todo.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (29:2) {#each todo as item, i}
    function create_each_block(ctx) {
    	var div, h3, t0_value = ctx.item.name, t0, t1, p, t2_value = ctx.item.description, t2, t3, button, t4, button_value_value, t5, div_name_value, dispose;

    	return {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			button = element("button");
    			t4 = text("Complete");
    			t5 = space();
    			add_location(h3, file, 30, 6, 490);
    			add_location(p, file, 31, 6, 517);
    			button.value = button_value_value = ctx.item.id;
    			add_location(button, file, 32, 6, 549);
    			attr(div, "name", div_name_value = ctx.item.name);
    			attr(div, "class", "card svelte-fi72l1");
    			add_location(div, file, 29, 4, 448);
    			dispose = listen(button, "click", prevent_default(ctx.handleCompleted));
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h3);
    			append(h3, t0);
    			append(div, t1);
    			append(div, p);
    			append(p, t2);
    			append(div, t3);
    			append(div, button);
    			append(button, t4);
    			append(div, t5);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.todo) && t0_value !== (t0_value = ctx.item.name)) {
    				set_data(t0, t0_value);
    			}

    			if ((changed.todo) && t2_value !== (t2_value = ctx.item.description)) {
    				set_data(t2, t2_value);
    			}

    			if ((changed.todo) && button_value_value !== (button_value_value = ctx.item.id)) {
    				button.value = button_value_value;
    			}

    			if ((changed.todo) && div_name_value !== (div_name_value = ctx.item.name)) {
    				attr(div, "name", div_name_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	var section;

    	var each_value = ctx.todo;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c: function create() {
    			section = element("section");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr(section, "id", "todo");
    			attr(section, "class", "svelte-fi72l1");
    			add_location(section, file, 27, 0, 398);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, section, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if (changed.todo) {
    				each_value = ctx.todo;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(section, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(section);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

      let { todo } = $$props;

      function handleCompleted(e) {
        dispatch('completed', {
          id: e.target.value
        });
      }

    	const writable_props = ['todo'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Todo> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('todo' in $$props) $$invalidate('todo', todo = $$props.todo);
    	};

    	return { todo, handleCompleted };
    }

    class Todo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["todo"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.todo === undefined && !('todo' in props)) {
    			console.warn("<Todo> was created without expected prop 'todo'");
    		}
    	}

    	get todo() {
    		throw new Error("<Todo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set todo(value) {
    		throw new Error("<Todo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* completed.svelte generated by Svelte v3.6.8 */

    const file$1 = "completed.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (19:2) {#each completed as item, i}
    function create_each_block$1(ctx) {
    	var div, p0, t0_value = ctx.item.name, t0, t1, p1, t2_value = ctx.item.description, t2, t3;

    	return {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			p1 = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			add_location(p0, file$1, 20, 6, 303);
    			add_location(p1, file$1, 21, 6, 328);
    			attr(div, "class", "cardComplete svelte-1kkfvju");
    			add_location(div, file$1, 19, 4, 270);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, p0);
    			append(p0, t0);
    			append(div, t1);
    			append(div, p1);
    			append(p1, t2);
    			append(div, t3);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.completed) && t0_value !== (t0_value = ctx.item.name)) {
    				set_data(t0, t0_value);
    			}

    			if ((changed.completed) && t2_value !== (t2_value = ctx.item.description)) {
    				set_data(t2, t2_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var section;

    	var each_value = ctx.completed;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	return {
    		c: function create() {
    			section = element("section");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr(section, "id", "todo");
    			attr(section, "class", "svelte-1kkfvju");
    			add_location(section, file$1, 17, 0, 215);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, section, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if (changed.completed) {
    				each_value = ctx.completed;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(section, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(section);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { completed } = $$props;

    	const writable_props = ['completed'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Completed> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('completed' in $$props) $$invalidate('completed', completed = $$props.completed);
    	};

    	return { completed };
    }

    class Completed extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["completed"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.completed === undefined && !('completed' in props)) {
    			console.warn("<Completed> was created without expected prop 'completed'");
    		}
    	}

    	get completed() {
    		throw new Error("<Completed>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set completed(value) {
    		throw new Error("<Completed>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* App.svelte generated by Svelte v3.6.8 */

    const file$2 = "App.svelte";

    function create_fragment$2(ctx) {
    	var main, form, input0, t0, input1, t1, button, t3, h30, t5, t6, hr, t7, h31, t9, current, dispose;

    	var todo_1 = new Todo({
    		props: { todo: ctx.todo },
    		$$inline: true
    	});
    	todo_1.$on("completed", ctx.markComplete);

    	var completed_1 = new Completed({
    		props: { completed: ctx.completed },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			main = element("main");
    			form = element("form");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			button = element("button");
    			button.textContent = "Add Task";
    			t3 = space();
    			h30 = element("h3");
    			h30.textContent = "ToDo";
    			t5 = space();
    			todo_1.$$.fragment.c();
    			t6 = space();
    			hr = element("hr");
    			t7 = space();
    			h31 = element("h3");
    			h31.textContent = "Completed";
    			t9 = space();
    			completed_1.$$.fragment.c();
    			input0.value = "name";
    			attr(input0, "type", "text");
    			add_location(input0, file$2, 45, 4, 823);
    			input1.value = "description";
    			attr(input1, "type", "text");
    			add_location(input1, file$2, 46, 4, 874);
    			attr(button, "type", "submit");
    			add_location(button, file$2, 47, 4, 939);
    			add_location(form, file$2, 44, 2, 777);
    			add_location(h30, file$2, 49, 2, 989);
    			add_location(hr, file$2, 54, 2, 1068);
    			add_location(h31, file$2, 55, 2, 1077);
    			attr(main, "class", "svelte-1na4wt1");
    			add_location(main, file$2, 43, 0, 768);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(form, "submit", prevent_default(ctx.addTask))
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, main, anchor);
    			append(main, form);
    			append(form, input0);

    			input0.value = ctx.name;

    			append(form, t0);
    			append(form, input1);

    			input1.value = ctx.description;

    			append(form, t1);
    			append(form, button);
    			append(main, t3);
    			append(main, h30);
    			append(main, t5);
    			mount_component(todo_1, main, null);
    			append(main, t6);
    			append(main, hr);
    			append(main, t7);
    			append(main, h31);
    			append(main, t9);
    			mount_component(completed_1, main, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.name && (input0.value !== ctx.name)) input0.value = ctx.name;
    			if (changed.description && (input1.value !== ctx.description)) input1.value = ctx.description;

    			var todo_1_changes = {};
    			if (changed.todo) todo_1_changes.todo = ctx.todo;
    			todo_1.$set(todo_1_changes);

    			var completed_1_changes = {};
    			if (changed.completed) completed_1_changes.completed = ctx.completed;
    			completed_1.$set(completed_1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(todo_1.$$.fragment, local);

    			transition_in(completed_1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(todo_1.$$.fragment, local);
    			transition_out(completed_1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(main);
    			}

    			destroy_component(todo_1);

    			destroy_component(completed_1);

    			run_all(dispose);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	

      let name = '';
      let description = '';
      let todo = [];
      let completed = [];

      function Item() {
        this.id = todo.length;
        this.name = name;
        this.description = description;
      }

      let addTask = (e) => {
        let item = new Item();
        
        $$invalidate('todo', todo = [...todo, item]);
      };

      function markComplete(e) {
        let item;
        for (let i = 0; i < todo.length; i++) {
          if (todo[i].id === Number(e.detail.id)) {
            item = todo[i];
            console.log('item', item);
            todo.splice(i, 1);
          }
        }

        $$invalidate('todo', todo = [...todo]);
        $$invalidate('completed', completed = [...completed, item]);
      }

    	function input0_input_handler() {
    		name = this.value;
    		$$invalidate('name', name);
    	}

    	function input1_input_handler() {
    		description = this.value;
    		$$invalidate('description', description);
    	}

    	return {
    		name,
    		description,
    		todo,
    		completed,
    		addTask,
    		markComplete,
    		input0_input_handler,
    		input1_input_handler
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
