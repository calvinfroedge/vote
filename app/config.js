Application.config = {
	logo: 'http://hacknashville.com/static/images/bg/logo.png',
	votes: 1, //This is the number of votes each participant can cast during voting
	voteables: [
		{
			title: 'Voting System App',
			people: ['Calvin Froedge', 'Ben Stucki', 'Hakan', 'Thomas', 'Beat', 'Paul'],
			description: 'An awesome voting system to be used for both HackNashville and BarCamp voting sessions.  Built with NodeJS and AngularJS.'
		}
	]  //These are the things that can be voted on
}

angular.module('application.main', [])

.factory('Config', function(){
	return Application.config;
})