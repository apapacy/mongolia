var testosterone = require('testosterone')({post: 3000, title: 'integration/integration_test.js'}),
    assert = testosterone.assert,

    Model = require('./../../lib/model'),
    mongodb = require('mongodb'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    db = new Db('mongolia_test', new Server('localhost', 27017, {auto_reconnect: true, native_parser: true}), {}),

    remove_users = function (cb) {
      db.collection('users', function (error, collection) {
        collection.remove({}, function () {
          db.collection('countries', function (error, collection) {
            collection.remove({}, cb);
          });
        });
      });
    };

db.open(function (error) {

  if (error) {
    throw error;
  }

  remove_users(function () {

    testosterone

      .add('`Insert` documents with `before/afterInsert` hooks', function (done) {
        var User = Model(db, 'users'),
            Country = Model(db, 'countries');

        User.beforeInsert = function (documents, callback) {
          documents.forEach(function (document) {
            document.has_country = true;
          });
          callback(null, documents);
        };

        User.afterInsert = function (documents, callback) {
          documents.forEach(function (document) {
            document.comments = [];
          });
          callback(null, documents);
        };

        User.namespaces = {
          'public': ['name', 'country']
        };

        Country.mongo('insert', {name: 'Andorra'}, function (error, docs) {
          var doc = docs[0];
          assert.equal(doc.name, 'Andorra');
          assert.ok(doc.created_at);

          User.mongo('insert:public', {name: 'zemba', country: doc, password: 'malicious'}, done(function (error, docs) {
            var doc = docs[0];
            assert.equal(doc.name, 'zemba');
            assert.equal(doc.has_country, true);
            assert.deepEqual(doc.country.name, 'Andorra');
            assert.equal(doc.password, null); // namespaced!
            assert.deepEqual(doc.comments, []);
          }));
        });
      })

      .add('`Update embedded` documents', function (done) {
        var User = Model(db, 'users'),
            Country = Model(db, 'countries');

        Country.mongo('findOne', {name: 'Andorra'}, function (error, doc) {
          User.updateEmbeddedDocument({_id: doc._id}, 'country', {name: 'France'}, {}, function (error, ret) {
            assert.equal(ret, 1);

            User.mongo('findOne', {name: 'zemba'}, done(function (error, doc) {
              assert.equal(doc.country.name, 'France');
            }));
          });
        });
      })

      .add('`Push embedded` documents', function (done) {
        var User = Model(db, 'users'),
            funk = require('funk')(),
            query = {name: 'zemba'};

        User.pushEmbeddedDocument(query, 'comments', {body: 'bla bla bla'}, {}, funk.add(function (error, ret) {
          assert.equal(ret, 1);
        }));

        User.pushEmbeddedDocument(query, 'comments', {body: 'trolling bla'}, {}, funk.add(function (error, ret) {
          assert.equal(ret, 1);
        }));

        funk.parallel(done);
      })

      .add('`findAndModify` documents with `before/afterUpdate` hooks', function (done) {
        var User = Model(db, 'users'),
            Country = Model(db, 'countries'),
            query = {name: 'zemba'},
            update = {'$set': {name: 'fleiba'}},
            calledBefore = false,
            calledAfter = false;


        User.beforeUpdate = function (_query, _update, _callback) {
          calledBefore = true;

          _update.$set.updated_at = new Date();

          Country.mongo('findOne', {name: 'Andorra'}, function (error, doc) {
            _update.$set['country.name'] = doc.name;

            assert.deepEqual(_query, query);
            assert.deepEqual(_update.$set.name, update.$set.name);
            assert.deepEqual(_update.$set['country.name'], 'Andorra');

            _callback(error, _query, _update);
          });
        };

        User.afterUpdate = function (_query, _update, _callback) {
          calledAfter = true;

          assert.deepEqual(_query, query);
          assert.deepEqual(_update.$set.name, update.$set.name);
          assert.deepEqual(_update.$set['country.name'], 'Andorra');

          _callback(null, _query, _update);
        };

        User.mongo('findAndModify', query, [], update, {'new': true}, done(function (error, doc) {
          assert.ok(calledBefore);
          assert.ok(calledAfter);
          assert.deepEqual(doc.country.name, 'Andorra');
          assert.deepEqual(doc.name, 'fleiba');
        }));
      })

      .add('`update` documents with `before/afterUpdate` hooks', function (done) {
        var User = Model(db, 'users'),
            Country = Model(db, 'countries'),
            query = {name: 'fleiba'},
            update = {'$set': {name: 'zemba'}},
            calledBefore = false,
            calledAfter = false;


        User.beforeUpdate = function (_query, _update, _callback) {
          calledBefore = true;

          _update.$set.updated_at = new Date();

          Country.mongo('findOne', {name: 'Andorra'}, function (error, doc) {
            _update.$set['country.name'] = 'France';

            assert.deepEqual(_query, query);
            assert.deepEqual(_update.$set.name, update.$set.name);

            _callback(error, _query, _update);
          });
        };

        User.afterUpdate = function (_query, _update, _callback) {
          calledAfter = true;

          assert.deepEqual(_query, query);
          assert.deepEqual(_update.$set.name, update.$set.name);
          assert.deepEqual(_update.$set['country.name'], 'France');

          _callback(null, _query, _update);
        };

        User.mongo('update', query, update, function (error, doc) {
          assert.ok(calledBefore);
          assert.ok(calledAfter);
          User.mongo('findArray', update.$set, done(function (error, docs) {
            var doc = docs[0];
            assert.deepEqual(doc.country.name, 'France');
            assert.deepEqual(doc.name, 'zemba');
          }));
        });
      })

      .add('`Remove` documents with `before/afterRemove` hooks', function (done) {
        var User = Model(db, 'users'),
            query = {name: 'zemba'},
            calledBefore = false,
            calledAfter = false;

        User.beforeRemove = function (_query, callback) {
          calledBefore = true;
          assert.deepEqual(query, _query);
          callback(null, _query);
        };

        User.afterRemove = function (_query, callback) {
          calledAfter = true;
          assert.deepEqual(query, _query);
          callback(null);
        };

        User.mongo('remove', query, function (error, ret) {
          assert.ok(calledBefore);
          assert.ok(calledAfter);
          User.mongo('findArray', {}, done(function (error, docs) {
            assert.deepEqual(docs, []);
          }));
        });
      })

      .add('`validateAndInsert` validates and inserts', function (done) {
        var User = Model(db, 'users');

        User.validate = function (document, update, callback) {
          var validator = require('./../../lib/validator')(document, update);

          if (update.name !== 'zemba') {
            validator.addError('name', 'We only love Zemba here');
          }

          callback(null, validator);
        };

        User.validateAndInsert({name: 'zemba'}, done(function (error, validation) {
          assert.equal(validation.updated_model.name, 'zemba');
          assert.deepEqual(validation.errors, {});

          // Try to insert an invalid record
          User.validateAndInsert({name: 'barbaz'}, function (error, validation) {
            assert.deepEqual(validation.errors.name, ['We only love Zemba here']);
          });
        }));
      })

      .add('`validateAndUpdate` validates and updates', function (done) {
        var User = Model(db, 'users');

        User.mongo('insert', {name: 'John Smith', age: 30}, function (errors, documents) {});

        User.validate = function (document, update, callback) {
          var validator = require('./../../lib/validator')(document);

          if (update.name !== 'zemba') {
            validator.addError('name', 'We only love Zemba here');
          }

          callback(null, validator);
        };

        User.validateAndUpdate({name: 'John Smith'}, {name: 'foobar'}, done(function (error, validation) {
          assert.deepEqual(validation.errors.name, ['We only love Zemba here']);
          assert.deepEqual(validation.updated_model.name, 'John Smith');

          User.validateAndUpdate({name: 'John Smith'}, {name: 'zemba'}, function (error, validation) {
            assert.deepEqual(validation.errors, {});
          });
        }));
      })

      .run();
  });
});
