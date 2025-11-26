/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React, {useState, useEffect} from 'react'
import {Form, Button, Alert, InputGroup} from 'react-bootstrap'
import {useAuthStore} from '@/app/store/authStore'
import {useRouter} from 'next/navigation'

export default function RegisterPage() {
    const router = useRouter()

    const signUp = useAuthStore(s => s.signUp)
    const loading = useAuthStore(s => s.loading)
    const error = useAuthStore(s => s.error)
    const isAuth = useAuthStore(s => s.isAuthenticated)

    // из твоего стора восстановления пароля
    const checkEmail = useAuthStore(s => s.checkEmail)
    const verifyEmail = useAuthStore(s => s.verifyEmail)
    const resetStep = useAuthStore(s => s.resetStep) // уже есть

    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    const [emailError, setEmailError] = useState<string | null>(null)
    const [phoneError, setPhoneError] = useState<string | null>(null)
    const [userError, setUserError] = useState<string | null>(null)
    const [passError, setPassError] = useState<string | null>(null)

    const [code, setCode] = useState('')
    const [codeError, setCodeError] = useState<string | null>(null)

    useEffect(() => {
        if (isAuth) router.push('/screens')
    }, [isAuth, router])

    const validate = () => {
        let ok = true
        setEmailError(null)
        setPhoneError(null)
        setUserError(null)
        setPassError(null)
        setCodeError(null)

        if (!email) {
            setEmailError('Введите email')
            ok = false
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Неверный формат email')
            ok = false
        }

        // 🔴 НОВОЕ: если формат ок, но email ещё не подтверждён
        if (ok && !emailVerified) {
            setEmailError('Подтвердите email перед регистрацией')
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

    // отправка кода на email через checkEmail
    const handleSendCode = async () => {
        setEmailError(null)
        setCodeError(null)

        if (!email) {
            setEmailError('Введите email')
            return
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Неверный формат email')
            return
        }

        const ok = await checkEmail(email)
        // если ошибка — она уже придёт в error из стора
        if (ok) {
            setCode('') // очищаем прошлый код, если был
        }
    }

// подтверждение кода через verifyEmail
    const handleConfirmCode = async () => {
        setCodeError(null)

        if (!code.trim()) {
            setCodeError('Введите код из письма')
            return
        }

        const session = await verifyEmail({email, code})
        if (!session) {
            // ошибка уже в error из стора, но локально подсветим поле
            setCodeError('Не удалось подтвердить код')
        } else {
            // код подтверждён, resetStep станет "verified"
            setCodeError(null)
        }
    }


    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        const ok = await signUp(username, phone, password, email)
        if (ok) router.push('/screens')
    }

    const emailVerified = resetStep === 'verified'
    const codeSent = resetStep === 'code_sent' || resetStep === 'verified'

    return (
        <Form onSubmit={onSubmit} style={{maxWidth: 400, margin: 'auto', padding: 20}}>
            <h3 className="mb-4">Регистрация</h3>
            {error && <Alert variant="danger">{error}</Alert>}

            {/* EMAIL + кнопка "отправить код" */}
            <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <InputGroup>
                    <Form.Control
                        type="email"
                        value={email}
                        onChange={e => {
                            setEmail(e.target.value)
                            setEmailError(null)
                        }}
                        isInvalid={!!emailError}
                        disabled={loading && !codeSent} // чтобы во время отправки не спамили
                    />
                    <Button
                        type="button"
                        variant={emailVerified ? 'success' : 'outline-secondary'}
                        onClick={handleSendCode}
                        disabled={loading || !email || emailVerified}
                    >
                        {loading && !emailVerified
                            ? 'Отправляю...'
                            : emailVerified
                                ? 'Email подтверждён'
                                : codeSent
                                    ? 'Отправить ещё раз'
                                    : 'Отправить код'}
                    </Button>
                </InputGroup>
                <Form.Control.Feedback type="invalid" style={emailError ? {display: 'block'} : {}}>
                    {emailError}
                </Form.Control.Feedback>

                {codeSent && !emailError && !emailVerified && (
                    <Form.Text className="text-muted">
                        Мы отправили код на вашу почту.
                    </Form.Text>
                )}
                {emailVerified && (
                    <Form.Text className="text-success">
                        Email успешно подтверждён.
                    </Form.Text>
                )}
            </Form.Group>

            {/* ПОЛЕ ДЛЯ КОДА + кнопка "подтвердить" */}
            {codeSent && (
                <Form.Group className="mb-3">
                    <Form.Label>Код из письма</Form.Label>
                    <InputGroup>
                        <Form.Control
                            type="text"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            isInvalid={!!codeError}
                            disabled={emailVerified}
                        />
                        <Button
                            type="button"
                            variant={emailVerified ? 'success' : 'outline-secondary'}
                            onClick={handleConfirmCode}
                            disabled={loading || emailVerified}
                        >
                            {emailVerified
                                ? 'Подтверждён'
                                : loading
                                    ? 'Проверяю...'
                                    : 'Подтвердить код'}
                        </Button>
                        <Form.Control.Feedback type="invalid">
                            {codeError}
                        </Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>
            )}

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

            <Button
                type="submit"
                disabled={loading || !emailVerified}   // 🔴 добавили !emailVerified
                className="w-100 mb-2"
            >
                {loading ? 'Загрузка…' : 'Зарегистрироваться'}
            </Button>

            <div className="text-center">
                <a href="/auth/login">Уже есть аккаунт? Войти</a>
            </div>
        </Form>
    )
}