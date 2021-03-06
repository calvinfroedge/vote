var Q = require('q');
var request = require('request');

module.exports = function(sio, db, config, colors){

	return {
		/*
		* Cast a Vote
		*/
		vote: function(req, res){
			req.session.votes = (req.session.votes) ? req.session.votes : [];

            //Check to see if the user is in  the voters list
            if(!req.body.email){
                res.send(401, 'Email must be included!');
                return;
            }

            if(!req.session.registered){
                res.send(401, 'Session is not registered.');
                return;
            }

            if(req.body.email){
                req.session.email = req.body.email;
                if(req.body.name) req.session.name = req.body.name;

                if(!config.voters[req.body.email]){
                    var fishy = {name: req.body.name, email: req.body.email}
                    db.collection('fishy_votes').insert(fishy, function(err, results) {
                        if(err){
                        }
                    });
                }
            }

			//Only users can vote
			if(!req.sessionID){
				res.send(401);
				return;
			}

			//Don't allow users to vote more times than they are supposed to
			if(req.session.votes.length >= config.votes){
				res.send(401, "You've already used all your votes!");
				return;
			}

			//Make sure user is not making the same vote twice
			for(var i = 0;i<req.session.votes;i++){
				if(req.session.votes[i]['id'] == req.params.id){
					res.send(401, "You already voted for this option!");
					return;
				}
			}

			castVote(req.params.id, req.sessionID, req.session).then(countVotes)
			.then(function(results) {
				sio.sockets.emit('vote cast', results);
                
                var colors = [];
                db.collection('voteables').find({}).toArray(function(err, vResults){
                    try{
                        console.log('vResults', vResults);
                        vResults.forEach(function(el){
                          colors[el.id] = el.color;
                        });

                        var url = 'http://192.168.14.69:8080/api/scaled';
                        var toSend = [];
                        console.log('results', results);
                        results.forEach(function(el){
                            console.log(el);
                            toSend.push({"color":colors[el['_id']], "value":el.count});
                        });

                        var  opts = {
                          headers: {'content-type':'application/x-www-form-urlencoded'},
                          method: 'POST',
                          url: url,
                          body: 'data='+JSON.stringify(toSend)
                          //JSON.stringify(json)
                        };
                        request.post(opts);
                    } catch(err) {
                        console.log('error during voteables sync to logic board', err);
                    }
                });
				res.send('ok');
			});
		},
		/*
		* Check Results
		*/
		results: function(req, res) {
            countVotes().then(function(results){
				res.send(results);
            });
		},
    clearmy: function(req, res){
        req.session.votes = [];
        res.send('ok');
    },

    countVotesWithColors: function(req, res) {
      db.collection('votes').aggregate({ $group: { _id: '$vote', count: { $sum: 1 } } }, function(err, rsl) {
        
        var finalResults = [];

        rsl.forEach(function(element) { 

          db.collection('voteables').find({id:element['_id']}).toArray(function(err, result) {

            element['color'] = result[0].color;

            finalResults.push(element);

            if (rsl.length == finalResults.length) {
              console.log(finalResults);
              res.send(finalResults);              
            }
          });

        });

      });
    }

	}

  function countVotes() {
		var collection = db.collection('votes')
		return Q.ninvoke(collection, 'aggregate', [ { $group: { _id: '$vote', count: { $sum: 1 } } }])
  }

  function castVote(id, sid, session) {
    var data = {vote: id, by: sid};
		session.votes.push(data);
		var collection = db.collection('votes');
    return Q.ninvoke(collection, 'insert', data)
		.then(function(results) {
			return results;
		});
  }

}
