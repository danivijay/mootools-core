/*
Script: Dom.js
	Css Query related function and <Element> extensions

Dependencies:
	<Moo.js>, <Function.js>, <Array.js>, <String.js>, <Element.js>

Author:
	Valerio Proietti, <http://mad4milk.net>

License:
	MIT-style license.
*/

/* Section: Utility Functions */

/*
Function: $S()
	Selects DOM elements based on css selector(s). Extends the elements upon matching.
	
Arguments:
	any number of css selectors
	
Example:
	>$S('a') //an array of all anchor tags on the page
	>$S('a', 'b') //an array of all anchor and bold tags on the page
	>$S('#myElement') //array containing only the element with id = myElement
	>$S('#myElement a.myClass') //an array of all anchor tags with the class "myClass" within the DOM element with id "myElement"

Returns:
	array - array of all the dom elements matched
*/

function $S(){
	var els = [];
	$A(arguments).each(function(sel){
		if ($type(sel) == 'string') els.extend(document.getElementsBySelector(sel));
		else if ($type(sel) == 'element') els.push($(sel));
	});
	return $Elements(els);
};


/*
Function: $$
	Same as <$S>
*/

var $$ = $S;

/* 
Function: $E 
	Selects a single (i.e. the first found) Element based on the selector passed in and an optional filter element.
	
Arguments:
	selector - the css selector to match
	filter - optional; a DOM element to limit the scope of the selector match; defaults to document.
	
Example:
>$E('a', 'myElement') //find the first anchor tag inside the DOM element with id 'myElement'
	
Returns:
	a DOM element - the first element that matches the selector
*/

function $E(selector, filter){
	return ($(filter) || document).getElement(selector);
};

/*
Function: $ES
	Returns a collection of Elements that match the selector passed in limited to the scope of the optional filter.
	See Also: <Element.getElements> for an alternate syntax.

Retunrs:
	array - an array of dom elements that match the selector within the filter
		
Arguments:
	selector - css selector to match
	filter - optional; a DOM element to limit the scope of the selector match; defaults to document.

Examples:
	>$ES("a") //gets all the anchor tags; synonymous with $S("a")
	>$ES('a','myElement') //get all the anchor tags within $('myElement')
*/

function $ES(selector, filter){
	return ($(filter) || document).getElementsBySelector(selector);
};

function $Elements(elements){
	return Object.extend(elements, new Elements);
};

/*
Class: Element
	Custom class to allow all of its methods to be used with any DOM element via the dollar function <$>.
*/

Element.extend({

/*
	Property: getElements 
		Gets all the elements within an element that match the given (single) selector.
	
	Arguments:
		selector - the css selector to match
	
	Example:
		>$('myElement').getElements('a'); // get all anchors within myElement

	Credits:
		Say thanks to Christophe Beyls <http://digitalia.be> for the new regular expression that rules getElements, a big step forward in terms of speed.
	*/

	getElements: function(selector){
		var filters = [];
		selector.clean().split(' ').each(function(sel, i){
			var bits = sel.test('^(\\w*|\\*)(?:#([\\w_-]+)|\\.([\\w_-]+))?(?:\\[["\']?(\\w+)["\']?(?:([\\*\\^\\$]?=)["\']?(\\w*)["\']?)?\\])?$');
			if (!bits) return;
			if (!bits[1]) bits[1] = '*';
			var param = bits.remove(bits[0]).associate(['tag', 'id', 'class', 'attribute', 'operator', 'value']);
			if (i == 0){
				if (param['id']){
					var el = this.getElementById(param['id']);
					if (!el || ((param['tag'] != '*') && ($Element(el, 'getTag') != param['tag']))) return;
					filters = [el];
				} else {
					filters = $A(this.getElementsByTagName(param['tag']));
				}
			} else {
				filters = $Elements(filters).filterByTagName(param['tag']);
				if (param['id']) filters = $Elements(filters).filterById(param['id']);
			}
			if (param['class']) filters = $Elements(filters).filterByClassName(param['class']);
			if (param['attribute']) filters = $Elements(filters).filterByAttribute(param['attribute'], param['value'], param['operator']);

		}, this);
		filters.each(function(el){
			$(el);
		});
		return $Elements(filters);
	},
	
	/*
	Property: getElementById
		Targets an element with the specified id found inside the Element. Does not overwrite document.getElementById.

	Arguments:
		id - the id of the element to find.
	*/
	
	getElementById: function(id){
		var el = document.getElementById(id);
		if (!el) return false;
		for(var parent = el.parentNode; parent != this; parent = parent.parentNode){
			if (!parent) return false;
		}
		return el;
	},

	/*
	Property: getElement
		Same as <Element.getElements>, but returns only the first. Alternate syntax for <$E>, where filter is the Element.

	*/

	getElement: function(selector){
		return this.getElementsBySelector(selector)[0];
	},

	/*
	Property: getElement
		Same as <Element.getElements>, but allows for comma separated selectors, as in css. Alternate syntax for <$S>, where filter is the Element.

	*/

	getElementsBySelector: function(selector){
		var els = [];
		selector.split(',').each(function(sel){
			els.extend(this.getElements(sel));
		}, this);
		return $Elements(els);
	}

});

document.extend = Object.extend;

/* Section: document related functions */

document.extend({
	/*
	Function: document.getElementsByClassName 
		Returns all the elements that match a specific class name. 
		Here for compatibility purposes. can also be written: document.getElements('.className'), or $S('.className')
	*/

	getElementsByClassName: function(className){
		return document.getElements('.'+className);
	},
	getElement: Element.prototype.getElement,
	getElements: Element.prototype.getElements,
	getElementsBySelector: Element.prototype.getElementsBySelector

});

/*
Class: Elements
	Methods for dom queries arrays, as <$S>.
*/

var Elements = new Class({

	/*
	Property: action
		Applies the supplied actions collection to each Element in the collection.
	
	Arguments:
		actions - an Object with key/value pairs for the actions to apply. 
		The initialize key is executed immediatly.
		Keys beginning with on will add a simple event (onclick for example).
		Keys ending with event will add an event with <Element.addEvent>.
		Other keys are useless.

	Example:
		>$S('a').action({
		>	initialize: function() {
		>		this.addClassName("anchor");
		>	},
		>	onclick: function(){
		>		alert('clicked!');
		>	},
		>	mouseoverevent: function(){
		>		alert('mouseovered!');
		>	}
		>});
	*/

	action: function(actions){
		this.each(function(el){
			el = $(el);
			if (actions.initialize) actions.initialize.apply(el);
			for(var action in actions){
				var evt = false;
				if (action.test('^on[\\w]{1,}')) el[action] = actions[action];
				else if (evt = action.test('([\\w-]{1,})event$')) el.addEvent(evt[1], actions[action]);
			}
		});
	},

	//internal methods

	filterById: function(id){
		var found = [];
		this.each(function(el){
			if (el.id == id) found.push(el);
		});
		return found;
	},

	filterByClassName: function(className){
		var found = [];
		this.each(function(el){
			if ($Element(el, 'hasClass', className)) found.push(el);
		});
		return found;
	},

	filterByTagName: function(tagName){
		var found = [];
		this.each(function(el){
			found.extend($A(el.getElementsByTagName(tagName)));
		});
		return found;
	},

	filterByAttribute: function(name, value, operator){
		var found = [];
		this.each(function(el){
			var att = el.getAttribute(name);
			if(!att) return;
			if (!operator) return found.push(el);
	
			switch(operator){
				case '*=': if (att.test(value)) found.push(el); break;
				case '=': if (att == value) found.push(el); break;
				case '^=': if (att.test('^'+value)) found.push(el); break;
				case '$=': if (att.test(value+'$')) found.push(el);
			}

		});
		return found;
	}

});

new Object.Native(Elements);