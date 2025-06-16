'use client'
import React, {useState, useEffect} from 'react'
import {Form, Button, Alert} from 'react-bootstrap'
import {useAuthStore} from '@/app/store/authStore'
import {useRouter} from 'next/navigation'

export default function RegisterPage() {
    const router = useRouter()
    const signUp = useAuthStore(s => s.signUp)
    const loading = useAuthStore(s => s.loading)
    const error = useAuthStore(s => s.error)
    const isAuth = useAuthStore(s => s.isAuthenticated)

    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    const [emailError, setEmailError] = useState<string | null>(null)
    const [phoneError, setPhoneError] = useState<string | null>(null)
    const [userError, setUserError] = useState<string | null>(null)
    const [passError, setPassError] = useState<string | null>(null)

    useEffect(() => {
        if (isAuth) router.push('/screens')
    }, [isAuth, router])

    const validate = () => {
        let ok = true
        setEmailError(null)
        setPhoneError(null)
        setUserError(null)
        setPassError(null)
        if (!email) {
            setEmailError('Введите email')
            ok = false
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Неверный формат email')
            ok = false
        }
        if (!phone) {
            setPhoneError('Введите телефон')
            ok = false
        } else if (!/^\+?\d{10,15}$/.test(phone)) {
            setPhoneError('Неверный формат телефона')
            ok = false
        }
        if (!username) {
            setUserError('Введите логин')
            ok = false
        } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            setUserError('Логин 3–20 символов, латиница/цифры/_')
            ok = false
        }
        if (!password) {
            setPassError('Введите пароль')
            ok = false
        } else if (password.length < 6) {
            setPassError('Пароль ≥ 6 символов')
            ok = false
        }
        return ok
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        const ok = await signUp(username, phone, password, email)
        if (ok) router.push('/screens')
    }

    return (
        <Form onSubmit={onSubmit} style={{maxWidth: 400, margin: 'auto', padding: 20}}>
            <h3 className="mb-4">Регистрация</h3>
            {error && <Alert variant="danger">{error}</Alert>}

            <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    isInvalid={!!emailError}
                />
                <Form.Control.Feedback type="invalid">{emailError}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Телефон</Form.Label>
                <Form.Control
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    isInvalid={!!phoneError}
                />
                <Form.Control.Feedback type="invalid">{phoneError}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Логин</Form.Label>
                <Form.Control
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    isInvalid={!!userError}
                />
                <Form.Control.Feedback type="invalid">{userError}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Пароль</Form.Label>
                <Form.Control
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    isInvalid={!!passError}
                />
                <Form.Control.Feedback type="invalid">{passError}</Form.Control.Feedback>
            </Form.Group>

            <Button type="submit" disabled={loading} className="w-100 mb-2">
                {loading ? 'Загрузка…' : 'Зарегистрироваться'}
            </Button>

            <div className="text-center">
                <a href="/auth/login">Уже есть аккаунт? Войти</a>
            </div>
        </Form>
    )
}
