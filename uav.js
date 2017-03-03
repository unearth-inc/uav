'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function () {

    /*
     * Array.prototype.from shim for IE
     */
    if (!Array.from) {

        Array.from = function (object) {

            return [].slice.call(object);
        };
    }

    /**
     * Turns an HTML string into an element
     */
    function parse(markup) {

        var el = document.createElement('div');

        el.innerHTML = markup;

        if (el.children.length > 1) {
            console.error('Components must have only one root node.');
        }

        el = el.firstElementChild;

        return el;
    }

    /**
     * Tests whether a value has properties that should be bound
     */
    function isVmEligible(value) {

        return value && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object';
    }

    /**
     * Binds an object's properties to the given function
     */
    function bindPropertiesToSetter(obj, setter) {

        Object.keys(obj).forEach(function (key) {

            var value = obj[key];

            Object.defineProperty(obj, key, {

                get: function get() {
                    return value;
                },
                set: function set(newVal) {

                    value = newVal;

                    setter('_childPropertyModified');
                }

            });

            if (isVmEligible(obj[key])) {

                bindPropertiesToSetter(obj[key], setter);
            }
        });
    }

    /**
     * Returns an object that will execute
     * bindings when its properties are set
     */
    function model(data) {

        var vm = {
            _bindings: {}
        };

        Object.keys(data).forEach(function (key) {

            function get() {

                /**
                 * If a property is accessed during expression
                 * evaluation, that means it should be bound.
                 */
                if (vm._currentlyCreatingBinding) {

                    vm._bindings[key] = vm._bindings[key] || [];

                    vm._bindings[key].push(vm._currentlyCreatingBinding);
                }

                return data[key];
            }

            function set(value) {

                if (data[key] !== value || (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {

                    if (value !== '_childPropertyModified') {

                        if (isVmEligible(value)) {

                            bindPropertiesToSetter(value, set);
                        }

                        data[key] = value;
                    }

                    if (vm._bindings[key]) {

                        vm._bindings[key].forEach(function (binding) {
                            return binding();
                        });
                    }
                }
            }

            Object.defineProperty(vm, key, {
                get: get,
                set: set
            });

            if (isVmEligible(data[key])) {

                bindPropertiesToSetter(data[key], set);
            }
        });

        return vm;
    }

    /**
     * Runs the given expression using an
     * object as the scope. Unlike eval(),
     * this does NOT evaluate the expression
     * with the privileges or scope of the
     * surrounding execution context.
     */
    function evaluate(expression, scope) {

        try {

            return new Function('with(arguments[0]){return ' + expression + ';}')(scope);
        } catch (err) {

            return '_invalidExpression';
        }
    }

    /**
     * Parses a template and creates bindings
     * to all values it references
     */
    function bind(template, vm, replace, alreadyBound) {

        var matches = template.match(/{.*?}/g);

        if (matches) {
            var binding = function binding() {

                var value = void 0,
                    content = template;

                matches.forEach(function (match) {

                    var prop = match.substring(1, match.length - 1);

                    if (!binding.bound && !alreadyBound) {

                        vm._currentlyCreatingBinding = binding;
                    }

                    value = evaluate(prop, vm);

                    delete vm._currentlyCreatingBinding;

                    var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);

                    if (type === 'boolean') {

                        content = content.replace(match, value ? prop : '');
                    } else if (type === 'function') {

                        content = value;
                    } else if (value === undefined || value === '_invalidExpression' || value === null) {

                        content = content.replace(match, '');
                    } else if (type === 'object') {

                        if (value._element) {

                            content = value._element;
                        } else {

                            content = value;
                        }
                    } else {

                        content = content.replace(match, value.toString());
                    }
                });

                replace(content);
            };

            binding();

            binding.bound = true;
        }
    }

    /*
     * Copy child nodes from one element to another,
     * leaving the original nodes in place
     */
    function copyChildNodes(from, to) {

        Array.from(from.childNodes).forEach(function (node) {
            return to.appendChild(node.cloneNode(true));
        });
    }

    /**
     * Helper for looping over element attributes.
     */
    function forEachAttribute(el, callback) {

        var attributes = Array.from(el.attributes).filter(function (attribute) {

            return attribute.specified && attribute.name !== 'as';
        }).map(function (attribute) {

            return {
                name: attribute.name,
                value: attribute.value
            };
        });

        attributes.forEach(function (attribute) {

            callback(attribute);
        });

        if (el.value) {

            callback({
                name: 'value',
                value: el.value
            });
        }
    }

    /*
     * Bind the given attribute to the given vm
     */
    function bindAttribute(el, attribute, vm, alreadyBound) {

        if (attribute.name === 'style') {

            bind(attribute.value, vm, function (style) {
                /*
                 * IE doesn't support setAttribute for styles
                 */
                el.style.cssText = style;
            }, alreadyBound);
        } else if (attribute.name === 'data-src') {

            bind(attribute.value, vm, function (src) {

                el.removeAttribute('data-src');

                el.setAttribute('src', src);
            }, alreadyBound);
        } else {

            bind(attribute.value, vm, function (value) {
                /*
                 * Assume function values are event handlers
                 */
                if (typeof value === 'function') {

                    el.removeAttribute(attribute.name);

                    el[attribute.name] = value;
                } else {

                    el.setAttribute(attribute.name, value);
                }
            }, alreadyBound);
        }
    }

    /**
     * Checks all elements and attributes for template expressions
     */
    function render(el, vm, alreadyBound) {

        forEachAttribute(el, function (attribute) {

            if (attribute.name === 'loop' && el.attributes.as) {
                var binding = function binding(data) {

                    if (data) {

                        var newEl = document.createElement(el.tagName);

                        if (Array.isArray(data)) {

                            var tempOriginalValue = vm[temp];

                            data.forEach(function (item) {

                                vm[temp] = item;

                                copyChildNodes(child, newEl);

                                render(newEl, vm, binding.bound);
                            });

                            vm[temp] = tempOriginalValue;
                        } else {

                            if (typeof temp === 'string') {

                                temp = temp.split('.');
                            }

                            Object.keys(data).forEach(function (key) {

                                var keyOriginalValue = vm[temp[0]],
                                    valOriginalValue = vm[temp[1]];

                                vm[temp[0]] = key;
                                vm[temp[1]] = data[key];

                                copyChildNodes(child, newEl);

                                render(newEl, vm, binding.bound);

                                vm[temp[0]] = keyOriginalValue;
                                vm[temp[1]] = valOriginalValue;
                            });
                        }

                        el.innerHTML = '';

                        Array.from(newEl.childNodes).forEach(function (node) {
                            return el.appendChild(node);
                        });
                    }
                };

                var child = parse('<div>' + el.innerHTML + '</div>');

                var temp = el.attributes.as.value;

                bind('{' + attribute.value + '}', vm, binding, alreadyBound);

                binding.bound = true;

                el.removeAttribute('loop');
                el.removeAttribute('as');
            } else {

                bindAttribute(el, attribute, vm, alreadyBound);
            }
        });

        Array.from(el.childNodes).forEach(function (child) {
            /*
             * Text nodes
             */
            if (child.nodeType === 3) {

                bind(child.textContent, vm, function (value) {

                    // Ridiculous IE10 behavior
                    // http://stackoverflow.com/questions/28741528/is-there-a-bug-in-internet-explorer-9-10-with-innerhtml
                    try {

                        child.textContent = value;
                    } catch (e) {

                        child.innerHTML = '';
                    }
                }, alreadyBound);
                /*
                 * Element nodes
                 */
            } else {

                var tag = child.tagName.toLowerCase();
                /*
                 * Child components
                 */
                if (vm[tag] !== undefined && vm[tag]._element) {

                    bind('{' + tag + '}', vm, function (newChild) {

                        if (child.parentNode === el) {

                            el.replaceChild(newChild, child);

                            child = newChild;
                        }
                    }, alreadyBound);
                } else {

                    render(child, vm, alreadyBound);
                }
            }
        });

        return el;
    }

    /**
     * Creates a bound component, optionally
     * inserting it into a parent node
     */
    function component(vm, template, selector) {

        if (typeof vm === 'string') {

            vm = {
                _element: parse(vm)
            };

            selector = template;
        } else {

            vm._element = render(parse(template), vm);
        }

        if (typeof selector === 'string') {

            var app = document.querySelector(selector);

            app.innerHTML = '';

            app.appendChild(vm._element);
        }

        Array.from(arguments).forEach(function (arg) {

            if (typeof arg === 'function') {

                arg(vm._element);
            }
        });

        return vm;
    }

    /**
     * Returns the first matched DOM node or executes
     * a callback on all matched DOM nodes
     */
    function uav(selector, callback) {

        if (callback) {

            Array.from(document.querySelectorAll(selector)).forEach(callback);
        } else {

            return document.querySelector(selector) || document.createElement('div');
        }
    }

    /**
     * Returns a placeholder component, for cases
     * where a template is bound to a component that
     * does not yet exist.
     */
    function placeholder(tag) {

        return {
            _element: document.createElement(tag || 'div')
        };
    }

    uav.model = model;

    uav.component = component;

    uav.placeholder = placeholder;

    if (typeof module !== 'undefined' && module.exports) {

        module.exports = uav;
    } else {

        window.uav = uav;
    }
})();