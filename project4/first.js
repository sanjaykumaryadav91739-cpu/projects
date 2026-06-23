// const Button1=document.getElementById('first');
// const Button2=document.getElementById('second');
// const h1=document.querySelector('h1');

// let count=0;
// Button1.addEventListener('click',()=>{
//     count++;
//     h1.textContent=`Counter is:${count}`;
//     Button1.style.backgroundColor='green';
// });

// Button2.addEventListener('click',()=>{
    
//     if(count==0){
//         return ;
//     }
//     count--;
//     h1.textContent=`Counter is:${count}`;
//     Button2.style.backgroundColor='green';
// })


const Button1 = document.getElementById('first');
const Button2 = document.getElementById('second');
const h1 = document.querySelector('h1');

let count = 0;

// Button1
Button1.addEventListener('mousedown', () => {
    Button1.style.backgroundColor = 'green';
});

Button1.addEventListener('mouseup', () => {
    Button1.style.backgroundColor = '';
});

Button1.addEventListener('click', () => {
    count++;
    h1.textContent = `Counter is: ${count}`;
});

// Button2
Button2.addEventListener('mousedown', () => {
    Button2.style.backgroundColor = 'green';
});

Button2.addEventListener('mouseup', () => {
    Button2.style.backgroundColor = '';
});

Button2.addEventListener('click', () => {
    if (count === 0) return;

    count--;
    h1.textContent = `Counter is: ${count}`;
});