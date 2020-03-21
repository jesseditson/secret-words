const ctx: Worker = self as any

ctx.onmessage = (e: any) => {
    console.log('Message received from main script');
    var workerResult = 'Result: ' + (e.data);
    console.log('Posting message back to main script');
    ctx.postMessage(workerResult);
  }