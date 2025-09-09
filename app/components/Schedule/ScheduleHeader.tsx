'use client'
import React from 'react'
import {Button} from 'react-bootstrap'
import {useScheduleStore} from "@/app/store/scheduleStore";

export default function ScheduleHeader() {

    const {sendSchedule, selectedScreens, selectedPlaylist, clearAllSlots} = useScheduleStore()

    return (
        <header
            style={{
                padding: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}
        >
            <h4 className="mb-0">Расписание</h4>

            <div className="d-flex flex-row align-content-center justify-content-center">
                <Button

                    style={{paddingLeft: 40, paddingRight: 40}}
                    onClick={sendSchedule}
                    variant="success"
                    disabled={selectedScreens.length === 0
                    }


                >
                    Сохранить
                </Button>


                <div style={{width: 12}}></div>

                <Button
                    style={{paddingLeft: 40, paddingRight: 40}}
                    variant="outline-primary"
                    onClick={clearAllSlots}
                >
                    Очистить
                </Button>
            </div>


        </header>
    )
}
