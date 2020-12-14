const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')


const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))


// server (emit) -> client (recieve) - countUpdated
// client (emit) -> server (recieve) - increment


io.on('connection', (socket) => {
    console.log('New websockert connection')

    socket.on('join', ({ username }, callbackAckLocation) => {
        const { error, user } = addUser({ id: socket.id, username})
        
        if (error) {
            return callbackAckLocation(error)
        }
        
        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', `Ohøj ${user.username} og velkommen til Coding Pirates chatrum!`)) // socket.emit emitter kun til den pågældende socket
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined the chat!`)) // broadcast emitter til alle undtagen den pågældende socket
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callbackAckLocation()

        // io.to.emit - emitter event til alle i samme room
        // socket.broadcast.to.emit - sending event to everyone in same room except the specific client
    })
    
    
    socket.on('sendMessage', (message, callbackAcknowledge) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callbackAcknowledge('Do NOT use BAD words!!!')
        }else

        io.to(user.room).emit('message', generateMessage(user.username, message)) // io-emit til alle
        callbackAcknowledge()
    })

    socket.on('sendLocation', (coords, callbackAckLocation) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callbackAckLocation()
    })

    socket.on('disconnect', () => { // disconnet is from socket.io library
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server is running on port ${port}!`)
})