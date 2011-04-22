var testosterone = require('testosterone')({post: 3000, sync: true, title: 'mongolia/helpers/collection_proxy.js'}),
    assert = testosterone.assert,
    gently = global.GENTLY = new (require('gently')),

    Collection = require('./../../lib/helpers/collection_proxy'),

    _model = {};

testosterone

  .add('`proxy` delegates every call to a function of Collection or native driver collection', function () {
    var coll = {foo: 'bar'},
        cb = function () {},
        args = ['zemba', cb];

    ['update', 'insert', 'findArray'].forEach(function (method) {
      gently.expect(Collection, method, function (model, collection, ar, cb) {
        assert.equal(model, _model);
        assert.equal(coll, collection);
        assert.deepEqual(args, ar);
        assert.equal(cb, cb);
      });

      Collection.proxy(_model, method, coll, args, cb);
    });

    ['find', 'foo'].forEach(function (method) {
      gently.expect(coll, method, function (arg, callback) {
        assert.equal(arg, args[0]);
        assert.deepEqual(callback, args[1]);
      });

      Collection.proxy(_model, method, coll, args, cb);
    });
  })

  .add('`proxy` can be called with no callback', function () {
    var coll = {foo: 'bar'},
        args = ['zemba'];

    ['update', 'insert', 'findArray'].forEach(function (method) {
      gently.expect(Collection, method, function (model, collection, ar, cb) {
        assert.equal(model, _model);
        assert.equal(coll, collection);
        assert.deepEqual(args, ar);
        assert.equal(typeof cb, 'function');
      });

      Collection.proxy(_model, method, coll, args);
    });

    ['find', 'foo'].forEach(function (method) {
      gently.expect(coll, method, function (arg, callback) {
        assert.equal(arg, args[0]);
        assert.deepEqual(callback, args[1]);
      });

      Collection.proxy(_model, method, coll, args);
    });
  })

  .add('`findArray` calls find on a collection with some arguments', function () {
    var coll = {foo: 'bar'},
        cb = function (error, cursor) {
          assert.deepEqual(error, "could not access DB");
        },
        cursor = {fleiba: 'zemba'},
        error_result = null,
        args = ['fleiba', cb];

    gently.expect(coll, 'find', function (ar) {
      assert.deepEqual(ar, args[0]);
      return cursor;
    });

    gently.expect(cursor, 'toArray', function (callback) {
      assert.deepEqual(callback, cb);
    });

    gently.restore(Collection, 'findArray');
    Collection.findArray(_model, coll, args, cb);
  })


  .add('`insert` inserts a record', function () {
    var coll = {insert: function (c, a) {}},
        cb = function (error, docs) {
          assert.deepEqual(error, 'could not access the DB');
          assert.equal(docs, null);
        },
        args = ['fleiba', cb];

    gently.expect(_model, 'beforeCreate', function (ar, callback) {
      assert.deepEqual(ar, args[0]);

      gently.expect(coll.insert, 'apply', function (collection, ars) {
        assert.deepEqual(collection, coll);
        assert.deepEqual(ars[0], ['document1', 'document2']);

        gently.expect(_model, 'afterCreate', function (docs, callback) {
          assert.deepEqual(docs, [1, 2, 3]);
          assert.deepEqual(callback, cb);
        });
        ars[1](null, [1, 2, 3]);

        //Trigger the error
        gently.expect(_model, 'afterCreate');
        ars[1]('could not access the DB', [1, 2, 3]);
      });
      callback(null, ['document1', 'document2']);

    });

    gently.restore(Collection, 'insert');
    Collection.insert(_model, coll, args, cb);
  })

  .add('`update` finds and modifies a record', function () {
    var coll = {update: function (c, a) {}},
        cb = function (error, docs) {
          assert.deepEqual(error, 'could not access the DB');
          assert.equal(docs, null);
        },
        args = ['fleiba', cb];

    gently.expect(_model, 'beforeUpdate', function (ar, callback) {
      assert.deepEqual(ar, args[0]);

      gently.expect(coll.update, 'apply', function (collection, ars) {
        assert.deepEqual(collection, coll);
        assert.deepEqual(ars[0], ['document1', 'document2']);

        gently.expect(_model, 'afterUpdate');
        ars[1](null, [1, 2, 3]);

        //Trigger the error
        gently.expect(_model, 'afterUpdate');
        ars[1]('could not access the DB', [1, 2, 3]);
      });

      callback(null, ['document1', 'document2']);
    });

    gently.restore(Collection, 'update');
    Collection.update(_model, coll, args, cb);
  })

  .add('`findAndModify` is an alias to `update`', function () {
    assert.deepEqual(Collection.findAndModify, Collection.update);
  })

  .add('`mapReduceCursor` calls mapReduce returning a cursor', function () {
    var collection = {'mapReduce': function () {}},
        args = ['a', 'b'],
        coll = {},
        cb = function () {};

    gently.expect(collection.mapReduce, 'apply', function (_collection, _args) {
      assert.equal(_collection, collection);
      assert.equal(_args, args);

      gently.expect(coll, 'find', function (callback) {
        assert.deepEqual(callback, cb);
      });
      _args[1](null, coll);
    });

    Collection.mapReduceCursor(_model, collection, args, cb);
  })

  .add('`mapReduceArray` returns a mapReduceCursor to Array', function () {
    var collection = {'mapReduce': function () {}},
        args = {},
        cursor = {},
        cb = function () {};

    gently.expect(Collection, 'mapReduceCursor', function (_collection, _args, _fn, _callback) {
      assert.equal(_collection, collection);
      assert.equal(_args, args);
      assert.equal(_fn, 'mapReduce');

      gently.expect(cursor, 'toArray', function (__callback) {
        assert.equal(__callback, cb);
      });
      _callback(null, cursor);
    });

    Collection.mapReduceArray(_model, collection, args, cb);
  })

  .add('`remove` removes a document', function () {
    var coll = {remove: function (c, a) {}},
        cb = function () {},
        args = ['fleiba', cb];

    gently.expect(_model, 'beforeRemove', function (ar, callback) {
      assert.deepEqual(ar, args[0]);

      gently.expect(coll.remove, 'apply', function (collection, ars) {
        assert.deepEqual(collection, coll);
        assert.deepEqual(ars[0], ['document1', 'document2']);
      });
      callback(null, ['document1', 'document2']);
    });

    Collection.remove(_model, coll, args, cb);
  })

  .run(function () {
    // zemba
  });
