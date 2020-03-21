const ctx: Worker = self as any;

ctx.addEventListener('install', function(event) {

});

ctx.addEventListener('message', (event) => console.log('Worker received:', event.data))
// self.postMessage('from Worker')
