import React from "react";
import { createStore } from "redux";
import { Provider, useSelector, useDispatch } from "react-redux";
import { DatePicker, List } from "antd";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
    CalendarOutlined,
    LeftOutlined,
    RightOutlined,
    BellOutlined,
} from "@ant-design/icons";
import { Calendar as AntCalendar } from "antd";
import "./css/MainPage.css";
import "moment/locale/ko"; // Import Korean locale
import { useState, useEffect } from "react";
import RCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Button } from "antd";
import {
    SmileOutlined,
    SearchOutlined,
    StarOutlined,
    SettingOutlined,
    LogoutOutlined,
} from "@ant-design/icons";
import { ListGroup } from "react-bootstrap"; // React Bootstrap 라이브러리에서 ListGroup 컴포넌트를 가져옵니다.
import MiniCalendar from "./components/MiniCalendar";
import GroupsList from "./components/GroupsList";
import MainCalendar from "./components/MainCalendar";
import NewPage from "./components/NewPage";
import ButtonPanel from "./components/ButtonPanel";
import AddSchedulePage from "./components/AddSchedulePage";
import MainLogo from "./components/MainLogo";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { refreshAccessToken } from "./security/TokenManage";
import Swal from "sweetalert2";
import { showLoginRequired } from "./security/ErrorController";

moment.locale("ko");

// Create the localizer
const localizer = momentLocalizer(moment);

// 일정 상세 통신
const getPersonalDetailSchedule = async (id, startDate, endDate, navigate) => {
    console.log(id, startDate, endDate);

    const accessToken = localStorage.getItem("accessToken");

    try {
        const config = {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        };

        const res = await axios.get(
            process.env.REACT_APP_SERVER_URL +
                `/api/personal-schedule/detail/date?memberId=${id}&date=${startDate}`,
            config
        );

        console.log("res", res);

        if (res.data.code === 200) {
            return res.data;
        } else if (res.data.code === 401) {
            await refreshAccessToken(navigate);
            getPersonalDetailSchedule(id, startDate, endDate, navigate);
        } else {
            throw new Error("unknown Error");
        }
    } catch (error) {
        console.error("유저 상세 일정 불러오기 에러 : ", error);
        Swal.fire({
            position: "center",
            icon: "error",
            title: "에러!",
            text: "서버와의 통신에 문제가 생겼어요!",
            showConfirmButton: false,
            timer: 1500,
        });
        return null;
    }
};

const getGroupDetailSchedule = async (
    groupId,
    memberId,
    inquiryDate,
    navigate
) => {
    const accessToken = localStorage.getItem("accessToken");

    try {
        const config = {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                groupId: groupId,
                memberId: memberId,
                inquiryDate: inquiryDate,
            },
        };

        const res = await axios.get(
            process.env.REACT_APP_SERVER_URL +
                `/api/group-schedule/groupScheduleSpecificReq`,
            config
        );
        console.log("GRes", res);

        if (res.data.code === 200) {
            return res.data;
        } else if (res.data.code === 401) {
            await refreshAccessToken(navigate);
            getGroupDetailSchedule(groupId, memberId, inquiryDate, navigate);
        } else {
            throw new Error("unknown Error");
        }
    } catch (error) {
        console.error("그룹 상세 일정 불러오기 에러 :", error);
        Swal.fire({
            position: "center",
            icon: "error",
            title: "에러!",
            text: "서버와의 통신에 문제가 생겼어요!",
            showConfirmButton: false,
            timer: 1500,
        });
        return null;
    }
};

// Define your updateDate action creator
const updateDate = newDate => {
    return {
        type: "UPDATE_DATE",
        payload: newDate,
    };
};

const setGroups = groups => {
    return {
        type: "SET_GROUPS",
        payload: groups,
    };
};

const getGroupList = async (id, navigate) => {
    const accessToken = localStorage.getItem("accessToken");

    try {
        const config = {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        };

        const res = await axios.get(
            process.env.REACT_APP_SERVER_URL + `/api/calendar/member/${id}`,
            config
        );

        console.log("list", res.data.data);

        if (res.data.code === 200) {
            return res.data.data;
        } else if (res.data.code === 401 || res.data.data === null) {
            await refreshAccessToken(navigate);
            getGroupList(id, navigate);
        } else {
            throw new Error("unknown Error");
        }
    } catch (error) {
        console.error(error);
        Swal.fire({
            position: "center",
            icon: "error",
            title: "에러!",
            text: "서버와의 통신에 문제가 생겼어요!",
            showConfirmButton: false,
            timer: 1500,
        });

        return [];
    }
};

function MainPage() {
    const navigate = useNavigate();

    useEffect(() => {
        const id = localStorage.getItem("userId");
        if (id === null) {
            showLoginRequired(navigate);
        }
    }, []);

    // 'default'와 'newPanel' 중 하나를 값으로 가질 수 있는 activePanel 상태 추가
    // 'default': 기본 left-panel을 보여줌, 'newPanel': 새로운 페이지를 left-panel에 보여줌
    const [editingSchedule, setEditingSchedule] = useState(null); // 편집 중인 일정 상태
    const [activePanel, setActivePanel] = useState("default");
    const [selectedDate, setSelectedDate] = useState(""); // 선택한 날짜 상태 추가
    const [schedule, setSchedule] = useState();

    const dispatch = useDispatch();
    const groups = useSelector(state => state.groups);

    useEffect(() => {
        const fetchGroups = async () => {
            const userId = localStorage.getItem("userId");
            if (userId) {
                const res = await getGroupList(userId, navigate);
                dispatch(setGroups(res));
            }
        };

        fetchGroups();
    }, [dispatch]);

    const selectedGroup = useSelector(state => state.selectedGroup);

    // ✅ 캘린더 슬롯 선택시!
    const onSlotSelect = async date => {
        setSelectedDate(date); // 선택한 날짜를 상태로 저장

        console.log(date);
        try {
            let res;

            console.log("selGId", selectedGroup);

            if (selectedGroup.groupId === -1) {
                res = await getPersonalDetailSchedule(
                    localStorage.getItem("userId"),
                    date,
                    navigate
                );
            } else {
                res = await getGroupDetailSchedule(
                    selectedGroup.groupId,
                    localStorage.getItem("userId"),
                    date,
                    navigate
                );

                res.data = res.data.map(item => {
                    return {
                        ...item,
                        id: item.scheduleId,
                    };
                });
            }

            console.log("res3", res);

            if (res && res.code == 200) {
                setSchedule(res.data);
            } else {
                console.error("상세 일정 불러오기 실패", res);
            }
        } catch (error) {
            console.error("상세 일정 불러오기 에러 : ", error);
        }

        setActivePanel("newPanel");
    };

    return (
        <div className="App">
            <div className="left-panel">
                {activePanel === "default" ? (
                    <React.Fragment>
                        <div className="mini-calendar-container">
                            <MiniCalendar />
                        </div>
                        <div className="group-and-button">
                            <div className="groups-list-container">
                                <GroupsList />
                            </div>
                            <div className="button-panel-container">
                                <ButtonPanel />
                            </div>
                        </div>
                    </React.Fragment>
                ) : activePanel === "newPanel" ? (
                    <div className="new-page-container">
                        <NewPage
                            setActivePanel={setActivePanel}
                            selectedDate={selectedDate}
                            schedule={schedule}
                            setEditingSchedule={setEditingSchedule}
                            selectedGroup={selectedGroup}
                        />
                    </div>
                ) : activePanel === "editSchedule" ? (
                    <div className="add-schedule-page-container">
                        <AddSchedulePage
                            setActivePanel={setActivePanel}
                            selectedDate={selectedDate}
                            editingSchedule={editingSchedule}
                        />
                    </div>
                ) : (
                    <div className="add-schedule-page-container">
                        <AddSchedulePage
                            setActivePanel={setActivePanel}
                            selectedDate={selectedDate}
                        />
                    </div>
                )}
            </div>
            <div className="right-panel">
                <MainCalendar onSlotSelect={onSlotSelect} />
                <MainLogo />
            </div>
        </div>
    );
}

export default MainPage;
