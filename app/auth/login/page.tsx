'use client'
import React, {useState, useEffect} from 'react'
import {Form, Button, Alert} from 'react-bootstrap'
import {useAuthStore} from '@/app/store/authStore'
import {useRouter} from 'next/navigation'

export default function LoginPage() {
    const router = useRouter()
    const signIn = useAuthStore(s => s.signIn)
    const loading = useAuthStore(s => s.loading)
    const error = useAuthStore(s => s.error)
    const isAuth = useAuthStore(s => s.isAuthenticated)

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [emailError, setEmailError] = useState<string | null>(null)
    const [passError, setPassError] = useState<string | null>(null)

    // если уже залогинены — редирект
    useEffect(() => {
        if (isAuth) router.push('/screens')
    }, [isAuth, router])

    const validate = () => {
        let ok = true
        setEmailError(null)
        setPassError(null)
        if (!email) {
            setEmailError('Введите email')
            ok = false
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Неверный формат email')
            ok = false
        }
        if (!password) {
            setPassError('Введите пароль')
            ok = false
        }
        return ok
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        const ok = await signIn(email, password)
        if (ok) router.push('/screens')
    }

    return (
        <Form onSubmit={onSubmit} style={{maxWidth: 400, margin: 'auto', padding: 20}}>
            <h3 className="mb-4">Вход</h3>
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
                <Form.Label>Пароль</Form.Label>
                <Form.Control
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    isInvalid={!!passError}
                />
                <Form.Control.Feedback type="invalid">{passError}</Form.Control.Feedback>
            </Form.Group>

            <Button type="submit" disabled={loading} className="w-100">
                {loading ? 'Загрузка…' : 'Войти'}
            </Button>

            <div className="mt-3 text-center">
                <a href="/auth/register">Регистрация</a>
            </div>
        </Form>
    )
}
