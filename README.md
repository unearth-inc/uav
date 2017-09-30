![uav logo](https://uav.js.org/images/uav.small.png)

`uav` is a JavaScript view library for developers who are skeptical of unnecessary complexity. 

* [Hello World](#hello-world)
* [Todo App](#todo-app)
* [Creating a Component](#creating-a-component)
* [Template Expressions](#template-expressions)
  * [Content Expressions](#content-expressions)
  * [Attribute Expressions](#attribute-expressions)
  * [Template Loops](#template-loops)
* [Events](#events)
* [Child Components](#child-components)
* [Passing Data to Children](#passing-data-to-children)
* [Creating a Model](#creating-a-model)
* [Binding HTML](#binding-html)
* [uav-attr](#uav-attr)
* [DOM Access](#dom-access)
* [Two Way Data Binding](#two-way-data-binding)
* [Performance Notes](#performance-notes)
* [Browser Compatibility](#browser-compatibility)

## Hello World

```
const component = uav.component(
    `<h1>{message}</h1>`,
    { message: 'Hello, world!' }, 
    '#app'
);

// Renders into the #app element:
<h1>Hello, world!</h1>

// After running the following ...
component.message = 'Goodbye, world.';

// ... the HTML automatically updates:
<h1>Goodbye, world.</h1>
```

## Todo App

[Click here for the live example](http://jsfiddle.net/t16bzg3m/13/)

## Creating a Component

`uav.component(template, model, container, callback)`

Arguments:
- `template` (String or Element): An HTML template. Must have exactly one root node.
- `model` (Object): A view model. Optional.
- `container` (String or Element): The element in which to render the component. Optional.
- `callback` (Function): A function to call after the initial render. Passed the component's root node. Optional.

Returns the model.

Changes to existing properties on the model will trigger an optimized re-render. Only the smallest DOM change possible will occur, down to the level of updating a single element attribute or text node. This is accomplished without any DOM diffing, because uav constructs a tree of closures that know exactly what needs to be updated whenever a particular property is changed.

## Template Expressions

By default, uav expressions use `{curly}` notation. Any browser-supported JavaScript can be used in an any expression. The result of the expression can be any of the following:
- String
- Number
- Function (for event handlers)
- Boolean (for simplified class and property bindings)
- DOM element (don't render untrusted HTML in templates)
- a uav component
- undefined or null (renders an empty string)

> You can change the template tag syntax with `uav.setTag()`. For example, to use `{{mustache}}` notation, call `uav.setTag('{{', '}}')` before creating any components.

### Content Expressions:
```
uav.component(
    `<div>This is a content expression: {content}</div>`,
    { content: 'foo' },
);
```

### Attribute Expressions:

Prepend `u-` to an attribute name to tell `uav` to parse it. 

```
const component = uav.component(
    `<div u-class="{className} {visible}"></div>`, {
    visible: true,
    className: 'component'
});

// Renders the following:
<div class="component visible"></div>
```

> If an attribute expression evaluates to a boolean, it will render nothing if false, or the property name if true. This makes toggling the "visible" class on the above `<div>` as easy as `component.visble = !component.visible`.

### Template Loops

Use the `u-for` attribute to loop over an array as follows:

```
uav.component(`
    <ul u-for="items as item">
        <li>{item}</li>
    </ul>
`, {
    items: [ 1, 2, 'three' ]
});
```

This component will render the following:

```
<ul>
    <li>1</li>
    <li>2</li>
    <li>three</li>
</ul>
```

You can set a variable for the index of the current item by adding a comma and a variable name to the attribute value:

```
uav.component(`
    <ul u-loop="items as item, index">
        <li class="item-{index}">{item}</li>
    </ul>
`, {
    items: [ 1, 2, 'three' ]
});
```

Renders:

```
<ul>
    <li class="item-0">1</li>
    <li class="item-1">2</li>
    <li class="item-2">three</li>
</ul>
```

Things you may wonder about:
- Properties of the parent model are available within a loop.
- Like a component, a loop's content must have one root node.
- Array methods that modify the array like `push` and `splice` will trigger a render.
- Curly braces are optional in the `u-loop` attribute, since we know the values will always be a template expression.

### Events

```
uav.component(
    `<button onclick="{click}">Click me</button>`,
    { click: e => console.log(e) }
);
```

Like any expression, you can pass data to an event handler:

```
uav.component(`
    <ul uav-loop="items" uav-as="item">
        <li onclick="{click(item)}">This is {item}</li>
    </ul>
`, {
    click: item => e => console.log(item),
    items: [ 'foo', 'bar', 'baz' ]
})
```

## Child Components

A component can be rendered into other components.

```
const child = uav.component(`<h3>I am a child.</h3>`);

uav.component(`
    <div>
        <h1>This is a component with a child.</h1>
        {child}
    </div>
`, { child });
```

This will render the following:

```
<div>
    <h1>This is a component with a child.</h1>
    <h3>I am a child.</h3>
</div>
```

### Passing Data to Children

```
const child = data => uav.component(
    `<em>{data}</em>`,
    { data }
);

uav.component(`
    <div>
        This component passes data to its child.
        {child}
    </div>
`, {
    child: child('This is passed from parent to child.')
});
```

The parent component above passes data when the model is created. You could just as easily pass the data through the template:

```
uav.component(`
    <div>
        This component passes data to its child.
        {child('This is passed from parent to child.')}
    </div>
`, { child });
```

Either way, it will render the following:

```
<div>
    This component passes data to its child.
    <em>This is passed from parent to child.</em>
</div>
```

uav supports swapping child components on the fly. For example, you could call `component.child = someOtherComponent` and the view will update accordingly. Just remember that uav is aggressive about avoiding memory leaks, and will remove any bindings that were attached to the original component before it was replaced. 

## Creating a Model

If you want to create a view model before associating it with a template, use `uav.model`. This can come in handy when a model refers to itself at render time.

```
const model = uav.model({
    active: true,
    isActive: () => model.active
});

const component = uav.component(
    '<div class="item {isActive() ? 'active' : 'inactive'}"></div>', 
    model
);
```

Note, however, that this can be a code smell. The above component could be more simply written without the `isActive` function: 

```
const component = uav.component(
    '<div class="item {active ? 'active' : 'inactive'}"></div>',
    { active: true }
);
```

A pragmatic dev will go further, knowing that it is never necessary to define two different CSS classes describing boolean states:

```
const component = uav.component(
    '<div class="item {active}"></div>',
    { active: true }
);
```

### Binding HTML
To render an HTML string as a DOM element, you can use `uav.parse()`.

```
uav.component(
    `<div>{html}</div>`, {
    html: uav.parse('<script>location="https://en.wikipedia.org/wiki/Cross-site_scripting"</script>')
});
```

## uav-attr

Use the `uav-attr` attribute to bind a boolean attribute on an element.

```
uav.component(
    `<input type="text" uav-attr="{disabled}">`,
    { disabled: true }
);

// Renders:
<input type="text" disabled>
```

Just because these are called boolean attributes doesn't mean they have to bound to a boolean value. Here's an example that uses a string:

```
uav.component(
    `<input type="text" uav-attr="{'aria-' + ariaProp}">`,
    { ariaProp: 'hidden' }
);

// Renders:
<input type="text" aria-hidden>
```

## DOM Access

Elements can be accessed directly by passing a selector to the `uav` or `uav.all` functions.

Access the first matched element:

`uav('.item').classList.toggle('visible');`

Run a callback on all matched elements:

`uav('.item', item => item.classList.toggle('visible'));`

Get an array of all matched elements:

`uav.all('.item').forEach(item => item.classList.toggle('visible'));`

## Two Way Data Binding

Two way binding is cool, but is only applicable to form interfaces, and can encourage lazy coding practices. Furthermore, it requires creating `oninput` event listeners behind the scenes, when often the use case only requires a `change` or `submit` listener. For these reasons it is included as a separate file, `uav-bind.js`. 

After including this file, any HTML input types that support the `value` property can be two-way bound using the `uav-bind` attribute. This means that when a user changes the value of any input element, the model will automatically update to reflect the new value, and if the model property changes, the input's value will update accordingly.

> To import `uav-bind.js` using commonjs or es6 modules, import the path `uav/dist/uav-bind`.

```
uav.component(
    `<input type="text" uav-bind="value"/>`,
    { value: 'hi there' }
);
```

Because checkbox inputs describe a list of selected items, they can only be bound to arrays.

```
uav.component(`
    <input type="checkbox" uav-bind="items" value="1" name="check">1<br>
    <input type="checkbox" uav-bind="items" value="2" name="check">2<br>
    <input type="checkbox" uav-bind="items" value="3" name="check">3<br>`, {
    items: [1, 2]
});
```

[See a live demo of two way binding](http://jsfiddle.net/ap7cp5eq/1/)

> `uav-bind.js` is 0.5KB compressed. 

## Performance Notes

### Only bind data when you have to

Avoid putting any data on the model that doesn't need to be bound to the DOM. If a particular value will never change, or changes to it don't need to update the DOM, just use a regular ES6 template variable to reference it (put a dollar sign in front of the expression).

```
const wontChange = 'hi!';

uav.component(`
    <div>
        <p>${wontChange}</p>
        <p>{willChange}</p>
    </div>
`, {
    willChange: 'loading...'
})
```

### Unbind any DOM nodes you've manually detached

When uav updates the DOM as a result of a change to a model, it automatically removes any bindings to DOM nodes that have been removed or replaced. However, if for some reason you manually remove or replace a bound DOM node, you can clean up any bindings associated with it by calling `uav.unbind(<Element>)`. 

## Collapsing Whitespace

Using multiline template strings creates unnecessary whitespace in your JavaScript files. To collapse this whitespace, add a step like this to your build process:

`tr -s " " < dist/bundle.js > dist/tmp && mv dist/tmp dist/bundle.js`

## Browser Compatibility

IE9+.

## Coming Soon

- uav-router: The simplest routing solution for single page apps.
- uav-server: Render your uav apps from Node to make them search-engine friendly.
