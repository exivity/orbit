import { clone, expose, extend, isArray, isNone } from 'orbit/lib/objects';

module("Orbit - Lib - Object", {
});

test("`clone` creates a deep clone of an object's own properties", function() {
  var obj = {
    a: 1,
    b: '2',
    c: ['3', {d: '4', e: ['5', '6']}, 7],
    f: new Date(),
    g: /123/g
  };

  var copy = clone(obj);

  deepEqual(obj, copy, 'clone is deeply equal to original');
  notStrictEqual(obj, copy, 'clone is not strictly equal to original');
});

test("`expose` can expose all the properties and methods from one object on another", function() {
  var earth = {
    name: 'earth',
    age: 4.5,
    greeting: function() {
      return 'hi from ' + this.name;
    }
  };

  var blank = {
    age: 0
  };

  expose(blank, earth);

  equal(blank.name, earth.name, 'name matches');
  equal(blank.age, earth.age, 'age matches');
  equal(blank.greeting(), earth.greeting(), 'greeting matches');

  blank.name = 'blank';
  equal(blank.greeting(), 'hi from earth', 'functions are evaluated with original context');
});

test("`expose` can expose specific properties and methods from one object on another", function() {
  var earth = {
    name: 'earth',
    age: 4.5,
    greeting: function() {
      return 'hi from ' + this.name;
    }
  };

  var blank = {
    name: 'blank',
    age: 0
  };

  expose(blank, earth, 'age', 'greeting');

  equal(blank.name, 'blank', 'name has not changed');
  equal(blank.age, earth.age, 'age matches');
  equal(blank.greeting(), earth.greeting(), 'greeting matches');

  blank.name = 'blank';
  equal(blank.greeting(), 'hi from earth', 'functions are evaluated with original context');
});

test("`isArray` checks whether an object is an array", function() {
  var obj = {length: 1};

  var arr = [];

  equal(isArray(obj), false, 'Fake array is not an array');

  equal(isArray(arr), true, 'Array can be identified');
});

test("`isNone` checks whether an object is `null` or `undefined`", function() {
  equal(isNone({}), false, 'Object is not null or undefined');
  equal(isNone(null), true, 'isNone identifies null');
  equal(isNone(undefined), true, 'isNone identifies undefined');
});

// TODO - expose, extend