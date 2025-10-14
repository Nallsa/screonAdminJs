"use client";
import React, {useMemo, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {Form, Button, Alert, Spinner, Card, InputGroup, ProgressBar} from "react-bootstrap";
import {useAuthStore} from "@/app/store/authStore";

type Stage = "email" | "code" | "password" | "done";

export default function RecoveryPage(): JSX.Element {
    const router = useRouter();
    const state = useAuthStore((s) => s)

    // Токен из ссылки (если используешь такой сценарий)
    const [stage, setStage] = useState<Stage>("password");

    // Поля
    const [email, setEmail] = useState<string>("");
    const [code, setCode] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirm, setConfirm] = useState<string>("");

    // Вспомогательные состояния
    const [showPwd, setShowPwd] = useState<boolean>(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [message, setMessage] = useState<string>("");

    // Если бэк при верификации кода отдаёт resetToken — сохраним
    const [resetToken, setResetToken] = useState<string | null>(null);

    // Валидации
    const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);
    const codeValid = useMemo(() => /^\d{6}$/.test(code), [code]);
    const {score, label} = useMemo(() => passwordStrength(password), [password]);
    const passwordsMatch = useMemo(() => password && password === confirm, [password, confirm]);

    const sendCodeFn = state?.requestPasswordResetCode ?? null;
    const verifyCodeOnlyFn = state?.confirmPasswordResetCode ?? null;
    const confirmWithCodeFn = state?.resetPassword ?? null;
    const confirmWithTokenFn = state?.confirmPasswordReset ?? null;

    // Отправка формы по активному шагу
    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setMessage("");

        try {
            setLoading(true);

            // Шаг 1: отправить код на почту
            if (stage === "email") {
                if (!emailValid) throw new Error("Введите корректный e-mail.");
                if (typeof sendCodeFn !== "function") {
                    throw new Error("Не найден метод отправки кода.");
                }
                const ok = await sendCodeFn(email);
                if (!ok) throw new Error(error || "Не удалось отправить код");
                setStage("code");
                setMessage(`Код отправлен на ${maskEmail(email)}. Введите его ниже.`);
                return;
            }

            // Шаг 2: верифицировать код → получим resetSession (строка)
            if (stage === "code") {
                if (!codeValid) throw new Error("Введите 6-значный код из письма.");
                if (typeof verifyCodeOnlyFn !== "function") {
                    throw new Error("Не найден метод верификации кода.");
                }
                const session = await verifyCodeOnlyFn({email, code});
                if (!session) throw new Error(error || "Не удалось подтвердить код");
                setResetToken(session); // сохраним локально, пригодится на шаге 3
                setMessage("Код подтверждён. Теперь задайте новый пароль.");
                setStage("password");
                return;
            }

            // Шаг 3: задать новый пароль
            if (stage === "password") {
                if (password.length < 8) throw new Error("Пароль должен быть не короче 8 символов.");
                if (!passwordsMatch) throw new Error("Пароли не совпадают.");

                // 3.1 Если есть токен из ссылки → подтверждаем по токену
                if (typeof confirmWithTokenFn === "function") {
                    const ok = await confirmWithTokenFn({newPassword: password});
                    if (!ok) throw new Error(error || "Не удалось обновить пароль");
                }
                // 3.2 Иначе — финалим по resetSession (который пришёл на шаге 2)
                else if (typeof confirmWithCodeFn === "function") {
                    const ok = await confirmWithCodeFn({newPassword: password, resetSession: resetToken || undefined});
                    if (!ok) throw new Error(error || "Не удалось обновить пароль");
                } else {
                    throw new Error("Не найден метод подтверждения сброса пароля.");
                }

                setStage("done");
                setMessage("Пароль успешно обновлён. Теперь можно войти.");
                return;
            }
        } catch (err: unknown) {
            setError((err as any)?.message || "Что-то пошло не так. Попробуйте ещё раз.");
        } finally {
            setLoading(false);
        }
    };

    // Заголовок и подзаголовок по шагам
    const title =
        stage === "done"
            ? "Готово"
            : stage === "email"
                ? "Восстановление пароля"
                : stage === "code"
                    ? "Подтверждение кода"
                    : "Сброс пароля";

    const subtitle =
        stage === "done"
            ? "Пароль обновлён. Можете войти, используя новый пароль."
            : stage === "email"
                ? "Укажите e-mail — мы отправим на него 6-значный код."
                : stage === "code"
                    ? "Введите код из письма."
                    : "Придумайте новый пароль и подтвердите его."


    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 p-3 bg-light">
            <Card className="shadow-sm w-100" style={{maxWidth: 480}}>
                <Card.Body className="p-4">
                    <h3 className="mb-1">{title}</h3>
                    <p className="text-muted mb-4">{subtitle}</p>

                    {!!error && <Alert variant="danger" className="mb-3">{error}</Alert>}
                    {!!message && <Alert variant="success" className="mb-3">{message}</Alert>}

                    {stage !== "done" ? (
                        <Form noValidate onSubmit={onSubmit}>
                            {/* ШАГ 1: EMAIL */}
                            {stage === "email" && (
                                <Form.Group className="mb-3" controlId="recoveryEmail">
                                    <Form.Label>E-mail</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        isInvalid={email.length > 0 && !emailValid}
                                        autoFocus
                                        required
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        Введите корректный адрес электронной почты.
                                    </Form.Control.Feedback>
                                    <Form.Text className="text-muted d-block mt-2">
                                        Письмо может прийти с задержкой 1–2 минуты. Проверьте папку «Спам».
                                    </Form.Text>
                                </Form.Group>
                            )}

                            {/* ШАГ 2: CODE */}
                            {stage === "code" && (
                                <>
                                    <Form.Group className="mb-3" controlId="verificationCode">
                                        <Form.Label>Код из письма</Form.Label>
                                        <Form.Control
                                            type="text"
                                            inputMode="numeric"
                                            pattern="\d{6}"
                                            maxLength={6}
                                            placeholder="123456"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                            isInvalid={code.length > 0 && !codeValid}
                                            autoFocus
                                            required
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            Введите 6-значный код.
                                        </Form.Control.Feedback>
                                    </Form.Group>

                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <Button
                                            variant="link"
                                            type="button"
                                            className="p-0 text-decoration-none"
                                            onClick={() => setStage("email")}
                                        >
                                            Изменить e-mail
                                        </Button>
                                        {/* Если нужен resend — добавлю таймер по просьбе */}
                                    </div>
                                </>
                            )}

                            {/* ШАГ 3: NEW PASSWORD */}
                            {stage === "password" && (
                                <>
                                    <Form.Group className="mb-3" controlId="newPassword">
                                        <Form.Label>Новый пароль</Form.Label>
                                        <InputGroup>
                                            <Form.Control
                                                type={showPwd ? "text" : "password"}
                                                placeholder="Минимум 8 символов"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                autoFocus
                                            />
                                            <Button
                                                variant="outline-secondary"
                                                type="button"
                                                onClick={() => setShowPwd((v) => !v)}
                                            >
                                                {showPwd ? "Скрыть" : "Показать"}
                                            </Button>
                                        </InputGroup>
                                        <div className="mt-2">
                                            <ProgressBar now={score} animated={password.length > 0}/>
                                            <small className="text-muted">Надёжность пароля: {label}</small>
                                        </div>
                                    </Form.Group>

                                    <Form.Group className="mb-3" controlId="confirmPassword">
                                        <Form.Label>Подтверждение пароля</Form.Label>
                                        <InputGroup>
                                            <Form.Control
                                                type={showConfirmPwd ? "text" : "password"}
                                                placeholder="Повторите пароль"
                                                value={confirm}
                                                onChange={(e) => setConfirm(e.target.value)}
                                                isInvalid={confirm.length > 0 && !passwordsMatch}
                                                required
                                            />
                                            <Button
                                                variant="outline-secondary"
                                                type="button"
                                                onClick={() => setShowConfirmPwd((v) => !v)}
                                            >
                                                {showConfirmPwd ? "Скрыть" : "Показать"}
                                            </Button>
                                            <Form.Control.Feedback type="invalid">
                                                Пароли должны совпадать.
                                            </Form.Control.Feedback>
                                        </InputGroup>
                                    </Form.Group>

                                    <div className="d-flex justify-content-between">
                                        <Button
                                            variant="link"
                                            type="button"
                                            className="p-0 text-decoration-none"
                                            onClick={() => setStage("code")}
                                        >
                                            ← Назад к коду
                                        </Button>
                                    </div>
                                </>
                            )}

                            <div className="d-grid gap-2 mt-3">
                                <Button
                                    type="submit"
                                    disabled={
                                        loading ||
                                        (stage === "email" && !emailValid) ||
                                        (stage === "code" && !codeValid) ||
                                        (stage === "password" && (!passwordsMatch || password.length < 8))
                                    }
                                >
                                    {loading && (
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"
                                                 className="me-2"/>
                                    )}
                                    {stage === "email"
                                        ? "Отправить код"
                                        : stage === "code"
                                            ? "Подтвердить код"
                                            : "Обновить пароль"}
                                </Button>

                                <Button
                                    variant="link"
                                    type="button"
                                    className="text-decoration-none"
                                    onClick={() => router.push("auth/login")}
                                >
                                    Вернуться ко входу
                                </Button>
                            </div>
                        </Form>
                    ) : (
                        <div className="d-grid gap-2">
                            <Button onClick={() => router.push("auth/login")}>Перейти ко входу</Button>
                            <Button variant="outline-secondary" onClick={() => router.push("/")}>На главную</Button>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
}

// ───────────────────────────── helpers ─────────────────────────────
function passwordStrength(pw: string) {
    let score = 0;
    if (!pw) return {score, label: "нет"};
    const lengthScore = Math.min(6, Math.floor(pw.length / 2)); // 0..6
    const hasLower = /[a-zа-я]/.test(pw);
    const hasUpper = /[A-ZА-Я]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSpecial = /[^\da-zA-Zа-яА-Я]/.test(pw);
    const variety = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length; // 0..4

    score = Math.min(100, lengthScore * 10 + variety * 15 + (pw.length >= 12 ? 20 : 0));
    let label = "слабый";
    if (score >= 80) label = "сильный";
    else if (score >= 50) label = "средний";
    return {score, label};
}

function maskEmail(v: string) {
    const [name, domain] = String(v).split("@");
    if (!domain) return v;
    const n = name?.slice(0, 2) || "";
    return `${n}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}
