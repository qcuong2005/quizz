import { get, post,del, patch } from "../utils/request"

export const createRooms = async(options)=>{
    const result = await post("rooms",options);
    return result;
}
export const listRooms =async()=>{
    const result = await get("rooms");
    return result;
}
export const deleteRoom = async (id)=>{
    const result = await del(`rooms/${id}`);
    return result;
}
export const udateRoom = async(id,options)=>{
    const result = await patch(`rooms/${id}`,options);
    return result;
}